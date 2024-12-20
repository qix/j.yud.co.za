import { threeByFiveFont } from "./font";
import { invariant } from "./invariant";
import { range } from "./range";
import { type WrapOptions, attemptWrap, wrap } from "./wrap";
import { fetchWithRetries } from "./retry";
import { delayMs } from "./delayMs";
import { ansiColor, ansiSgr } from "./ansi";

interface ColorInfo {
  symbol: string;
  ansi: number;
  css: string;
}

export const VestaCode = {
  " ": 0,
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8,
  i: 9,
  j: 10,
  k: 11,
  l: 12,
  m: 13,
  n: 14,
  o: 15,
  p: 16,
  q: 17,
  r: 18,
  s: 19,
  t: 20,
  u: 21,
  v: 22,
  w: 23,
  x: 24,
  y: 25,
  z: 26,
  "1": 27,
  "2": 28,
  "3": 29,
  "4": 30,
  "5": 31,
  "6": 32,
  "7": 33,
  "8": 34,
  "9": 35,
  "0": 36,
  "!": 37,
  "@": 38,
  "#": 39,
  $: 40,
  "(": 41,
  ")": 42,
  "-": 44,
  "+": 46,
  "&": 47,
  "=": 48,
  ";": 49,
  ":": 50,
  "'": 52,
  '"': 53,
  "%": 54,
  ",": 55,
  ".": 56,
  "/": 59,
  "?": 60,
  "°": 62,
  R: 63,
  O: 64,
  Y: 65,
  G: 66,
  B: 67,
  V: 68, // Violet
  W: 69,
  L: 70, // Black
  F: 71, // Filled
};
export type VestaCell = keyof typeof VestaCode;

function splitCells(cells: string | VestaCell[]): VestaCell[] {
  if (typeof cells === "string") {
    return cells.split("").map((cell) => {
      invariant(
        VestaCode.hasOwnProperty(cell),
        "Unsupported code: " + JSON.stringify(cell)
      );
      return cell as VestaCell;
    });
  }
  return cells;
}

const codeToCell: (VestaCell | null)[] = Array.from(new Array(72)).map(
  () => null
);

const dedupedCells: VestaCell[] = Object.keys(VestaCode).filter((key) => {
  return key !== "F" && key != " ";
}) as VestaCell[];
export const colorCells: VestaCell[] = ["R", "O", "Y", "G", "B", "V"]; // , "W", "L"
Object.entries(VestaCode).forEach(([cell, idx]) => {
  codeToCell[idx] = cell as VestaCell;
});

const colors: { [name: string]: ColorInfo } = {
  white: {
    symbol: "W",
    ansi: 7,
    css: 'white',
  },
  red: {
    symbol: "R",
    ansi: 1,
    css: 'red',
  },
  orange: {
    symbol: "O",
    ansi: 214, // cyan
    css: 'orange',
  },
  yellow: {
    symbol: "Y",
    ansi: 3,
    css: 'yellow',
  },
  green: {
    symbol: "G",
    ansi: 2,
    css: 'green',
  },
  blue: {
    symbol: "B",
    ansi: 4,
    css: 'blue',
  },
  violet: {
    symbol: "V",
    ansi: 5, // magenta
    css: 'violet',
  },
  black: {
    symbol: "L",
    ansi: 0,
    css: 'black',
  },
  // @todo: Handle black vestaboard
  filled: {
    symbol: "W",
    ansi: 7,
    css: 'white',
  },
};

const colorBySymbol = Object.fromEntries(
  Object.values(colors).map((info) => [info.symbol, info])
);

export function randomChoice(set: VestaCell[]): VestaCell {
  return set[Math.floor(Math.random() * set.length)];
}

export class Vestaboard {
  static width = 22;
  static height = 6;

  current!: Array<Array<keyof typeof VestaCode>>;
  remoteState: string | null = null;
  disabled: boolean;
  apiKey: string | null = null;

  constructor(props: { apiKey?: string; disabled?: boolean } = {}) {
    this.clear();
    this.disabled = props.disabled || false;
    this.apiKey = props.apiKey || null;
  }

  clear() {
    this.current = range(Vestaboard.height).map(() =>
      range(Vestaboard.width).map(() => " " as keyof typeof VestaCode)
    );
  }

  canWriteTruncated(y: number, x: number, text: string) {
    const { complete } = attemptWrap(
      text,
      Vestaboard.width - x,
      Vestaboard.height - y
    );
    if (!complete) {
      return false;
    }
    return text.split("").every((c) => {
      return c === "\n" || VestaCode.hasOwnProperty(c);
    });
  }

  set(y: number, x: number, cell: VestaCell) {
    this.current[y][x] = cell;
  }
  write(y: number, x: number, text: string) {
    text.split("\n").forEach((line, yOffset) => {
      splitCells(line).forEach((letter, idx) => {
        invariant(idx + x < Vestaboard.width, "Cell outside of bounds");
        this.set(y + yOffset, idx + x, letter);
      });
    });
  }

  writeTruncated(
    y: number,
    x: number,
    text: string,
    options: WrapOptions = {}
  ) {
    const wrapped = wrap(
      text,
      Vestaboard.width - x,
      Vestaboard.height - y,
      options
    );
    this.write(y, x, wrapped);
  }

  write3x5(x: number, text: string, symbol: string = "#") {
    this.write(0, x, threeByFiveFont.convert(text).replaceAll("#", symbol));
  }

  center3x5(text: string, symbol: string = "#") {
    const width = text.length * 4 - 1;
    const padding = Math.floor((Vestaboard.width - width) / 2);
    this.write3x5(padding, text, symbol);
  }

  map(cb: (y: number, x: number, current: VestaCell) => VestaCell) {
    for (let y = 0; y < Vestaboard.height; y++) {
      for (let x = 0; x < Vestaboard.width; x++) {
        this.set(y, x, cb(y, x, this.current[y][x]));
      }
    }
  }
  randomize(set: string | VestaCell[] = dedupedCells) {
    const split = splitCells(set);
    this.map(() => randomChoice(split));
  }

  fill(cell: VestaCell) {
    this.map(() => cell);
  }
  writeRow(row: number, text: string) {
    const padLeft = Math.max(0, Math.floor(Vestaboard.width - text.length) / 2);
    text = " ".repeat(padLeft) + text;
    text = text.substring(0, Vestaboard.width);
    text = text + " ".repeat(Vestaboard.width - text.length);
    this.write(row, 0, text);
  }

  async fetch() {
    invariant(this.apiKey, 'API key required to fetch from vestaboard');
    await fetch(`https://rw.vestaboard.com/`, {
      headers: {
        "Content-Type": "application/json",
        "X-Vestaboard-Read-Write-Key": this.apiKey,
      },
      method: "GET",
    }).then(async (res) => {
      invariant(res.status === 200, "Expected 200 from vestaboard fetch");
      const data = (await res.json()) as {
        currentMessage: { layout: string };
      };
      const fetchedState = JSON.parse(data.currentMessage.layout);
      this.current = fetchedState.map((row: number[]) => {
        return row.map((cellCode) => {
          invariant(
            cellCode < codeToCell.length && codeToCell[cellCode] !== null,
            "Unknown cell code: " + cellCode
          );
          return codeToCell[cellCode];
        });
      });
      this.remoteState = this.toString();
    });
  }

  async send(options: { disableRetries?: boolean } = {}) {
    if (this.disabled) {
      console.error('Skipping vestaboard write due to VESTABOARD_DISABLE');
      return;
    }
    invariant(this.apiKey, 'API key required to send to vestaboard');
    // @todo: this doesn't handle concurrency with updating remoteState
    const res = await fetchWithRetries(
      `https://rw.vestaboard.com/`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Vestaboard-Read-Write-Key": this.apiKey,
        },
        method: "POST",
        body: JSON.stringify(this.codes()),
      },
      {
        async retryResponse(res) {
          if (options.disableRetries) {
            return false;
          }
          if (res.status >= 500 && res.status < 600) {
            const data = (await res.json()) as {
              status: string;
              message: string;
            };
            if (
              data.status === "error" &&
              data.message === "You have been rate limited"
            ) {
              console.error("Vestaboard ratelimited, waiting 5000ms");
              await delayMs(5000);
            }
            return true;
          }
          return false;
        },
      }
    );

    if (res.status === 304) {
      // not modified
      this.remoteState = this.toString();
      return false;
    } else if (res.status === 200) {
      this.remoteState = this.toString();
      return true;
    } else {
      throw new Error("Unknown vestaboard response: " + res.status);
    }
  }


  htmlString() {
    let output = '';
    this.current.forEach((row) => {
      row.forEach((cell) => {
        if (cell.toLowerCase() != cell) {
          const color = colorBySymbol[cell];
          if (!color) {
            throw new Error("Invalid color");
          }
          output += (
            '<span class="char" style=' + JSON.stringify('background:' + color.css) + '>&nbsp;</span>'
          );
        } else if (cell.length === 1) {
          output += '<span class="char">' + (cell.toUpperCase()).replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;") + '</span>';
        } else {
          throw new Error("Unexpected cell: " + JSON.stringify(cell));
        }
      });
      output += ("\n");
    });
    return output;
  }

  ansiString() {
    let output = ("/" + "-".repeat(Vestaboard.width) + "\\\n");
    this.current.forEach((row) => {
      output += ("|");
      row.forEach((cell) => {
        if (cell.toLowerCase() != cell) {
          const color = colorBySymbol[cell];
          if (!color) {
            throw new Error("Invalid color");
          }
          output += (
            ansiColor({
              background: color.ansi,
            }) +
            " " +
            ansiSgr([0])
          );
        } else if (cell.length === 1) {
          output += (cell.toUpperCase())
        } else {
          throw new Error("Unexpected cell: " + JSON.stringify(cell));
        }
      });
      output += ("|\n");
    });
    output += ("\\" + "-".repeat(Vestaboard.width) + "/\n");
    return output;
  }

  toString() {
    return this.current.map((row) => row.join("")).join("\n");
  }

  codes() {
    return this.current.map((row) => {
      return row.map((cell) => VestaCode[cell]);
    });
  }

  hasChanged() {
    return this.remoteState !== this.toString();
  }
}
