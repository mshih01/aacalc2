export function preparse(
  isnaval: boolean,
  input: string,
  attdef: number,
  skipAA: boolean = false,
): string {
  const token_out = preparse_token(input);
  const art_out = preparse_artillery(token_out, attdef);
  if (isnaval) {
    const bat_out = preparse_battleship(art_out);
    return bat_out;
  }
  if (skipAA) {
    const aa_out = preparse_skipaa(art_out);
    return aa_out;
  }
  return art_out;
}

export function count_units(input: string, tok: string): number {
  let cnt = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i);
    if (ch == tok) {
      cnt++;
    }
  }
  return cnt;
}

export function preparse_token(input: string): string {
  const space = ' ';
  const comma = ',';

  const a = input.split(space).join('');
  const b = a.split(comma).join('');
  let out = '';
  const len = b.length;
  for (let i = 0; i < len; i++) {
    const term = b.substring(i, len);
    const c = parseInt(term);
    if (c > 0) {
      // number seen.
      const dd = c.toString();
      const e = dd.length;
      const unit = term.charAt(e);

      // c is the number of units (5)
      // e is the index of unit 'i'
      let temp = '';
      for (let j = 0; j < c; j++) {
        temp = temp + unit;
      }
      out = out + temp;
      i += e;
    } else {
      out = out + b.charAt(i);
    }
  }

  return out;
}
function preparse_artillery(input: string, attdef: number): string {
  if (attdef != 0) {
    return input;
  }
  let out = input;

  const numArt = count_units(input, 'a') + count_units(input, 'g');
  let cnt = 0;
  for (let i = 0; i < out.length; i++) {
    const ch = out.charAt(i);
    if (ch == 'i') {
      if (cnt < numArt) {
        let newout;
        if (i > 0) {
          newout = out.substring(0, i) + 'd' + out.substring(i + 1, out.length);
        } else {
          newout = 'd' + out.substring(1, out.length);
        }
        out = newout;
        cnt++;
      }
    }
    if (ch == 'j') {
      if (cnt < numArt) {
        let newout;
        if (i > 0) {
          newout = out.substring(0, i) + 'h' + out.substring(i + 1, out.length);
        } else {
          newout = 'h' + out.substring(1, out.length);
        }
        out = newout;
        cnt++;
      }
    }
  }
  return out;
}
function preparse_skipaa(input: string): string {
  let out = '';
  for (const ch of input) {
    if (ch == 'c') {
      out += 'e';
    } else {
      out += ch;
    }
  }
  return out;
}

export function preparse_battleship(input: string): string {
  // remove "E"
  let removeE = '';
  for (const ch of input) {
    if (ch == 'E') {
      continue;
    }
    removeE += ch;
  }

  let out = removeE;
  const numBB = count_units(input, 'B');
  for (let i = 0; i < numBB; i++) {
    out += 'E';
  }
  return out;
}
