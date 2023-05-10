const addCommas = (x) => {
  return x.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
    const imdbURL = imdbLink?.getAttribute('href');

    if (!imdbURL) {
      throw new Error('IMDb link not found');
    }

    const imdbRatingsDistributionURL = imdbURL.replace('maindetails', 'ratings');

    const corsProxyURL = 'https://vercel-cors-proxy-nine.vercel.app/api?url=';
    const encodedImdbURL = encodeURIComponent(imdbRatingsDistributionURL);
    const response = await fetchWithRetry(corsProxyURL + encodedImdbURL);

    const imdbRatingsPage = new DOMParser().parseFromString(await response.text(), 'text/html');

    const nextDataScript = imdbRatingsPage.querySelector('script#__NEXT_DATA__');
    const nextDataJson = nextDataScript?.textContent || '{}';
    const nextData = JSON.parse(nextDataJson);
    const histogramData = nextData?.props?.pageProps?.contentData?.histogramData;

    const ratingArr = histogramData?.histogramValues;
    const sortedArr = ratingArr.sort((a, b) => a.rating - b.rating);

    const ratings = sortedArr?.map((rating) => rating?.voteCount || 0);

    const totalRatings = histogramData?.totalVoteCount || 0;

    const { absoluteScore } = getScoreDetails({
      totalRatings,
      fiveStars: ratings[8] + ratings[9],
      oneStars: ratings[0] + ratings[1],
    });

    return {
      imdbScore: absoluteScore,
      imdbTotalRatings: totalRatings,
    };
  } catch (e) {
    console.error(`Error getting IMDB rating details for movie: ${e}`);
    return {
      imdbScore: 0,
      imdbTotalRatings: 0,
      imdbLink: '',
    };
  }
}

const run = async (ratings) => {
  const { imdbScore, imdbTotalRatings, imdbLink } = await getIMDBRatingDetails();

  const absoluteScore = ratings[9] + ratings[8] - ratings[0] - ratings[1];

  const letterBoxdTotalRatings = ratings.reduce((a, b) => a + b, 0);

  const ratio = (absoluteScore + imdbScore) / (letterBoxdTotalRatings + imdbTotalRatings);
  const calculatedOverallScore = Math.round((absoluteScore + imdbScore) * ratio);

  const ScoreElement = document.createElement('div');
  ScoreElement.innerHTML = `${addCommas(String(calculatedOverallScore))} (${Math.round(
    ratio * 100
  )}%)`;

  const Headline = document.querySelector('.ratings-histogram-chart  h2 a');
  ScoreElement.appendAfter(Headline);
};

let hasRun = false;
var observer = new MutationObserver(async function (mutations) {
  mutations.forEach(async function (mutation) {
    if (!mutation.addedNodes) {
      return;
    }

    const ratingNodes = document.getElementsByClassName('rating-histogram-bar');

    if (ratingNodes.length && !hasRun) {
      const ratings = Array.from(ratingNodes).map((element) =>
        parseInt(element.textContent.replace(/,/g, '').split('&')[0])
      );
      hasRun = true;
      await run(ratings);
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
