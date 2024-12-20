import { invariant } from "./invariant";
import { range } from "./range";

function splitLetters(data: string) {
  const lines = data.split("\n");

  return range(10).map((digit) => {
    return range(5)
      .map((line) => {
        return lines[line].substring(digit * 4, digit * 4 + 3);
      })
      .join("\n");
  });
}
const digits: string[] = splitLetters(
  "" +
    "###. # . # .## .# #.###.###.###.###.###\n" +
    "# #.## .# #.  #.# #.#  .#  .  #.# #.# #\n" +
    "# #. # .  #. # .###.###.###. # . # .###\n" +
    "# #. # . # .  #.  #.  #.# #. # .# #.  #\n" +
    "###. # .###.## .  #.## .###. # .###.###"
);

const all: { [char: string]: string } = Object.fromEntries(
  digits.map((digit, idx) => [
    String.fromCharCode("0".charCodeAt(0) + idx),
    digit,
  ])
);

function addSymbols(chars: string, data: string) {
  const fontText = splitLetters(data);
  chars.split("").forEach((char, idx) => {
    all[char] = fontText[idx];
  });
}

addSymbols(
  " :",
  "" +
    "   .   .   .   .   .   .   .   .   .   \n" +
    "   . # .   .   .   .   .   .   .   .   \n" +
    "   .   .   .   .   .   .   .   .   .   \n" +
    "   . # .   .   .   .   .   .   .   .   \n" +
    "   .   .   .   .   .   .   .   .   .   "
);

export const threeByFiveFont = {
  all,
  digits,
  convert(text: string) {
    let outputLines = ["", "", "", "", ""];
    text.split("").map((char) => {
      console.log(char);
      invariant(
        all.hasOwnProperty(char),
        "Unknown font char: " + JSON.stringify(char)
      );
      all[char].split("\n").forEach((line, idx) => {
        outputLines[idx] += (outputLines[idx] ? " " : "") + line;
      });
    });
    return outputLines.join("\n");
  },
};
