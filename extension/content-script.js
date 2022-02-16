const addCommas = (x) => {
  return x.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

(Element.prototype.appendAfter = function (element) {
  element.parentNode.insertBefore(this, element.nextSibling);
}),
  false;

const run = (ratings) => {
  const absoluteScore = ratings[9] + ratings[8] - ratings[0] - ratings[1];

  const sum = ratings.reduce((a, b) => a + b, 0);
  const ratio = absoluteScore / sum;

  const calculatedScore = Math.round(absoluteScore * ratio);

  const ScoreElement = document.createElement('div');
  ScoreElement.innerHTML = `${addCommas(String(calculatedScore))} (${Math.round(ratio * 100)}%)`;

  const Headline = document.querySelector('.ratings-histogram-chart  h2 a');
  ScoreElement.appendAfter(Headline);
};

let hasRun = false;
var observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (!mutation.addedNodes) {
      return;
    }

    const ratingNodes = document.getElementsByClassName('rating-histogram-bar');

    if (ratingNodes.length && !hasRun) {
      const ratings = Array.from(ratingNodes).map((element) =>
        parseInt(element.textContent.replace(/,/g, '').split('&')[0])
      );
      run(ratings);
      hasRun = true;
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
