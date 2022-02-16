const addCommas = (x) => {
  return x.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

(Element.prototype.appendAfter = function (element) {
  element.parentNode.insertBefore(this, element.nextSibling);
}),
  false;

const ratings = Array.from(document.getElementsByClassName('leftAligned'))
  .slice(1, 11)
  .map((element) => parseInt(element.textContent.replace(/,/g, '')));

const absoluteScore = ratings[0] + ratings[1] - ratings[9] - ratings[8];

const sum = ratings.reduce((a, b) => a + b, 0);
const ratio = absoluteScore / sum;

const calculatedScore = Math.round(absoluteScore * ratio);

const ScoreElement = document.createElement('div');
ScoreElement.innerHTML = `${addCommas(String(calculatedScore))} (${Math.round(ratio * 100)}%)`;
ScoreElement.className = 'sectionHeading';

const Headline = document.getElementsByClassName('sectionHeading')[0];
ScoreElement.appendAfter(Headline);
