(Element.prototype.appendAfter = function(element) {
  element.parentNode.insertBefore(this, element.nextSibling);
}),
  false;

const ratings = Array.from(document.getElementsByClassName('leftAligned'))
  .slice(1, 11)
  .map((element) => parseInt(element.textContent.replace(',', '')));

const score = ratings[0] + ratings[1] - ratings[9] - ratings[8];

const sum = ratings.reduce((a, b) => a + b, 0);
const ratio = Math.round((score / sum) * 100);

const ScoreElement = document.createElement('div');
ScoreElement.innerHTML = ` ${ratio}% (${score})`;
ScoreElement.className = 'sectionHeading';

const Headline = document.getElementsByClassName('sectionHeading')[0];
ScoreElement.appendAfter(Headline);
