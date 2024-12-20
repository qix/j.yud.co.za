import { invariant } from "./invariant";
import { range } from "./range";

export interface WrapOptions {
  skipSegments?: number;
  verticalCenter?: boolean;
  alignBottom?: boolean;

  // Not sure the names for this, but center every line or still match left column
  horizontalCenter?: boolean;
  horizontalAlign?: boolean;
}

export function attemptWrap(
  text: string,
  width: number,
  height: number,
  options: WrapOptions = {}
): {
  result: string;
  complete: boolean;
} {
  let buffer = text;
  let output: string = "";
  let complete: boolean = true;

  let y = 0;
  let x = 0;
  let skipSegments = options.skipSegments ?? 0;
  let skippableSegments = 0;

  const lineFeed = () => {
    y += 1;
    x = 0;
    output = output.trimEnd() + "\n";
    return width;
  };

  while (buffer.length) {
    while (buffer.startsWith("\n") || buffer.startsWith(" ")) {
      if (buffer.startsWith("\n")) {
        lineFeed();
      } else {
        if (x === width) {
          lineFeed();
        } else {
          output += " ";
          x += 1;
        }
      }
      buffer = buffer.substring(1);
    }
    if (!buffer.length) {
      break;
    }

    const nextLine = buffer.indexOf("\n");
    const nextSpace = buffer.indexOf(" ");
    const nextBreak = Math.min(
      nextLine < 0 ? buffer.length : nextLine,
      nextSpace < 0 ? buffer.length : nextSpace
    );
    let word = buffer.substring(0, nextBreak);
    buffer = buffer.substring(nextBreak);

    while (y < height && word) {
      let remaining = width - x;
      if (remaining <= 0 || (remaining < 2 && word.length >= 2)) {
        remaining = lineFeed();
      }
      if (y >= height) {
        break;
      }

      if (word.length > remaining && x > 0) {
        if (skipSegments > 0) {
          remaining = lineFeed();
          invariant(y < height, "Expected to be able to safely skip");
          skipSegments -= 1;
        } else {
          skippableSegments += 1;
        }
      }

      if (word.length > remaining) {
        // Add a `-` and skip to the next line
        const substring = word.substring(0, remaining - 1);

        // If the trimmed word already ends in a `-` don't add another one
        const trimmed = substring.charAt(substring.length - 1) === "-";
        output += substring + (trimmed ? "" : "-") + "\n";
        word = word.substring(remaining - 1);
        x = 0;
        y += 1;
        if (!trimmed && word.charAt(0) === "-") {
          word = word.substring(1);
        }
      } else {
        output += word;
        x += word.length;
        word = "";
      }
    }

    if (y >= height && word) {
      complete = false;
    }
  }
  if (skippableSegments > 0 && y + 1 < height) {
    return attemptWrap(text, width, height, {
      ...options,
      skipSegments:
        (options.skipSegments ?? 0) +
        Math.min(skippableSegments, height - y - 1),
    });
  }

  let resultLines = output.trimEnd().split("\n");
  if (options.verticalCenter) {
    const verticalPadding = Math.floor((height - resultLines.length) / 2);
    resultLines.unshift(...range(verticalPadding).map((n) => ""));
  } else if (options.alignBottom) {
    const verticalPadding = height - resultLines.length;
    resultLines.unshift(...range(verticalPadding).map((n) => ""));
  }

  if (options.horizontalCenter) {
    if (options.horizontalAlign) {
      const padding = Math.min(
        ...resultLines.map((line) => {
          return Math.floor((width - line.length) / 2);
        })
      );
      resultLines = resultLines.map((line) =>
        line.trim() ? " ".repeat(padding) + line : line
      );
    } else {
      resultLines = resultLines.map((line) => {
        if (!line.trim()) {
          return line;
        }
        const padding = Math.floor((width - line.length) / 2);
        return " ".repeat(padding) + line;
      });
    }
  }

  return {
    result: resultLines.join("\n"),
    complete,
  };
}

export function wrap(
  text: string,
  width: number,
  height: number,
  options: WrapOptions = {}
) {
  const { result } = attemptWrap(text, width, height, options);
  return result;
}
