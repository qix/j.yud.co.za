const ANSI_ESCAPE = "\x1B[";
export function ansiSgr(sequence: number[]) {
  return ANSI_ESCAPE + sequence.map((s) => s.toString()).join(";") + "m";
}
export function ansiColor(props: {
  foreground?: number;
  background?: number;
  bold?: boolean;
  blink?: boolean;
  dim?: boolean;
  strike?: boolean;
  bright?: boolean;
  bright_background?: boolean;
  underline?: boolean;
  overline?: boolean;
}) {
  const sequence: number[] = [];
  if (props.bold) sequence.push(1);
  if (props.dim) sequence.push(2);
  if (props.underline) sequence.push(4);
  if (props.blink) sequence.push(5);
  if (props.strike) sequence.push(9);
  if (props.overline) sequence.push(53);
  if (typeof props.foreground === "number")
    sequence.push(30 + props.foreground + (props.bright ? 60 : 0));
  if (typeof props.background === "number")
    sequence.push(40 + props.background + (props.bright_background ? 60 : 0));
  return ansiSgr(sequence);
}
