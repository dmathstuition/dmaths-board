import { describe, expect, it } from "vitest";
import { parseMath, layout, estimate, mathExtent, type Node } from "@/lib/mathType";
import { cleanStroke, itemBounds, scaleItem } from "@/lib/whiteboard";

// A short text form of the parsed maths, to check the structure.
function show(n: Node): string {
  switch (n.t) {
    case "text": return n.s;
    case "row": return n.items.map(show).join(" ");
    case "paren": return `${n.open}${show(n.body)}${n.close}`;
    case "sup": return `${show(n.base)}^{${show(n.sup)}}`;
    case "sub": return `${show(n.base)}_{${show(n.sub)}}`;
    case "subsup": return `${show(n.base)}_{${show(n.sub)}}^{${show(n.sup)}}`;
    case "frac": return `frac{${show(n.num)}}{${show(n.den)}}`;
    case "sqrt": return n.index ? `root{${show(n.index)}}{${show(n.body)}}` : `sqrt{${show(n.body)}}`;
    case "matrix": return `mat[${n.rows.map((r) => r.map(show).join(",")).join(";")}]`;
  }
}

describe("the equation writer", () => {
  it("reads powers, fractions and roots", () => {
    expect(show(parseMath("x^2 + 3/4"))).toBe("x^{2} + frac{3}{4}");
    expect(show(parseMath("(x+1)/(x-1)"))).toBe("frac{x + 1}{x − 1}");
    expect(show(parseMath("x^(n+1)"))).toBe("x^{n + 1}");
    expect(show(parseMath("sqrt(b^2 - 4ac)"))).toBe("sqrt{b^{2} − 4 a c}");
    expect(show(parseMath("root(3, 27) = 3"))).toBe("root{3}{27} = 3");
    expect(show(parseMath("x_1^2"))).toBe("x_{1}^{2}");
  });

  it("reads matrices, symbols and words", () => {
    expect(show(parseMath("[1, 2; 3, 4]"))).toBe("mat[1,2;3,4]");
    expect(show(parseMath("2pi r"))).toBe("2 π r");
    expect(show(parseMath("x <= 5 and y != 2"))).toBe("x ≤ 5 and y ≠ 2");
    expect(show(parseMath("sin theta"))).toBe("sin θ");
    expect(show(parseMath("abs(x - 3)"))).toBe("|x − 3|");
    expect(show(parseMath("90 deg"))).toBe("90 °");
  });

  it("never throws on half-typed maths", () => {
    for (const s of ["x^", "(", "3/", "[1, 2;", "sqrt(", "root(3,", ")", "/4", "x__2", "]]]", "^^"]) {
      expect(() => layout(parseMath(s), 30, estimate)).not.toThrow();
    }
  });

  it("a fraction is taller than one line; a matrix grows with its rows", () => {
    const line = mathExtent("x + 1", 30), frac = mathExtent("1/2", 30), m2 = mathExtent("[1;2]", 30), m3 = mathExtent("[1;2;3]", 30);
    expect(frac.h).toBeGreaterThan(line.h);
    expect(m3.h).toBeGreaterThan(m2.h);
  });

  it("is a board item that keeps, sizes and grows", () => {
    const s = cleanStroke({ id: "m1", by: "h", kind: "math", color: "#1657C9", w: 4, pts: [0.2, 0.3], text: "x^2 + 3/4" })!;
    expect(s).toMatchObject({ kind: "math", text: "x^2 + 3/4" });
    expect(cleanStroke({ id: "m2", by: "h", kind: "math", color: "#000", w: 4, pts: [0.2, 0.3], text: "  " })).toBeNull();
    const b = itemBounds(s);
    expect(b.x2).toBeGreaterThan(b.x1); expect(b.y2).toBeGreaterThan(b.y1);
    expect(scaleItem(s, 2).w).toBe(8);
  });
});
