const addCommas = (x) => {
  return x.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

function tallyRatings(document, recentRatings) {
  const ratings = document.querySelectorAll('span.rating');

  ratings.forEach((rating) => {
    const ratingClass = [...rating.classList].find((className) => className.startsWith('rated-'));
    if (ratingClass) {
      const ratingValue = parseInt(ratingClass.split('-')[1], 10);
      recentRatings.totalNumberOfRatings += 1;
      if (ratingValue > 8) {
        recentRatings.scoreAbsolute += 1;
      }
      if (ratingValue <= 2) {
        recentRatings.scoreAbsolute -= 1;
      }
    }
  });

  return recentRatings;
}

const getRecentRatingsSummary = async () => {
  const recentRatings = { totalNumberOfRatings: 0, scoreAbsolute: 0, scorePercentage: 0 };
  const currentURL = window.location.href;
  const numberOfPagesToParse = 15;

  const parser = new DOMParser();
  const fetchPromises = [];

  for (let i = 1; i <= numberOfPagesToParse; i++) {
    fetchPromises.push(
      fetch(`${currentURL}reviews/by/added/page/${i}/`, {
        body: null,
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
      }).then((response) => response.text())
    );
  }

  const recentRatingsHTMLs = await Promise.all(fetchPromises);

  recentRatingsHTMLs.forEach((recentRatingsHTML) => {
    const document = parser.parseFromString(recentRatingsHTML, 'text/html');
    tallyRatings(document, recentRatings);
  });

  recentRatings.scorePercentage = Math.round(
    (recentRatings.scoreAbsolute / recentRatings.totalNumberOfRatings) * 100
  );

  return recentRatings;
};

async function fetchWithRetry(url, maxRetries = 5, retryDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request failed with status code ${response.status}`);
      }

      return response;
    } catch (error) {
      console.warn(`Fetch attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * 2 ** (attempt - 1)));
      } else {
        throw error;
      }
    }
  }
}

(Element.prototype.appendAfter = function (element) {
  element.parentNode.insertBefore(this, element.nextSibling);
}),
  false;

const getScoreDetails = ({ totalRatings, fiveStars, oneStars }) => {
  const absoluteScore = fiveStars - oneStars;
  const ratio = absoluteScore / totalRatings;
  const calculatedScore = Math.round(absoluteScore * ratio);
  return { calculatedScore, ratio, absoluteScore };
};

async function getIMDBRatingDetails() {
  try {
    const imdbLink = document.querySelector('a[href*="imdb.com/title"]');

    if (!imdbLink?.href) {
      console.warn('IMDb link not found, defaulting to zero scores');
      return { imdbScore: 0, imdbTotalRatings: 0 };
    }

    const imdbRatingsDistributionURL = imdbLink.href.replace('maindetails', 'ratings');
    const corsProxyURL = 'https://vercel-cors-proxy-nine.vercel.app/api?url=';
    const encodedImdbURL = encodeURIComponent(imdbRatingsDistributionURL);

    const response = await fetchWithRetry(corsProxyURL + encodedImdbURL);
    const imdbRatingsPage = new DOMParser().parseFromString(await response.text(), 'text/html');

    const nextDataScript = imdbRatingsPage.querySelector('script#__NEXT_DATA__');
    if (!nextDataScript?.textContent) {
      console.warn('IMDb ratings data not found, defaulting to zero scores');
      return { imdbScore: 0, imdbTotalRatings: 0 };
    }

    const nextData = JSON.parse(nextDataScript.textContent);
    const histogramData = nextData?.props?.pageProps?.contentData?.histogramData;

    if (!histogramData?.histogramValues) {
      console.warn('IMDb histogram data not found, defaulting to zero scores');
      return { imdbScore: 0, imdbTotalRatings: 0 };
    }

    const ratingArr = histogramData.histogramValues;
    const sortedArr = ratingArr.sort((a, b) => a.rating - b.rating);
    const ratings = sortedArr.map((rating) => rating?.voteCount || 0);
    const totalRatings = histogramData.totalVoteCount || 0;

    const { absoluteScore } = getScoreDetails({
      totalRatings,
      fiveStars: ratings[8] + ratings[9],
      oneStars: ratings[0] + ratings[1],
    });

    return {
      imdbScore: absoluteScore,
      imdbTotalRatings: totalRatings,
    };
  } catch (error) {
    console.error('Error fetching IMDb ratings:', error.message);
    return {
      imdbScore: 0,
      imdbTotalRatings: 0,
    };
  }
}

const run = async (ratings) => {
  const { imdbScore, imdbTotalRatings } = await getIMDBRatingDetails();

  const absoluteScore = ratings[9] + ratings[8] - ratings[0] - ratings[1];

  const letterBoxdTotalRatings = ratings.reduce((a, b) => a + b, 0);

  const ratio = (absoluteScore + imdbScore) / (letterBoxdTotalRatings + imdbTotalRatings);
  const calculatedOverallScore = Math.round((absoluteScore + imdbScore) * ratio);

  const ScoreElement = document.createElement('div');
  ScoreElement.innerHTML = `${addCommas(String(calculatedOverallScore))} (${Math.round(
    ratio * 100
  )}%)`;
  ScoreElement.style = 'margin-top: 0.5rem;';

  const Headline = document.querySelector('.ratings-histogram-chart  h2 a');
  ScoreElement.appendAfter(Headline);

  const recentRatingPercentage = (await getRecentRatingsSummary()).scorePercentage;

  const trendingScore = Math.round((calculatedOverallScore * recentRatingPercentage) / 100);
  const TrendingScoreElement = document.createElement('div');
  TrendingScoreElement.innerHTML = `Trending Score: ${addCommas(
    String(trendingScore)
  )}, Recent Reviews: ${recentRatingPercentage}% `;
  TrendingScoreElement.style = 'margin-top: 0.5rem; font-size:16px; font-weight: bold; ';

  TrendingScoreElement.appendAfter(document.querySelector('.review.body-text'));
};

let observer;

function initObserver() {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver(async function (mutations) {
    for (const mutation of mutations) {
      if (!mutation.addedNodes) continue;

      const ratingNodes = document.getElementsByClassName('rating-histogram-bar');

      if (ratingNodes.length) {
        observer.disconnect();
        const ratings = Array.from(ratingNodes).map(
          (element) => parseInt(element.textContent.replace(/,/g, '').split('&')[0]) || 0
        );
        try {
          await run(ratings);
        } catch (error) {
          console.error('Error in run function:', error);
        }
        break;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Call initObserver when the script loads
initObserver();
