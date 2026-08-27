import { expectedScore, newRating } from "../rating";

describe("rating updates", () => {
  it("increases rating after a win", () => {
    const expected = expectedScore(1200, 1200);
    const updatedRating = newRating(1200, expected, 1);

    expect(updatedRating).toBe(1216);
  });

  it("decreases rating after a loss", () => {
    const expected = expectedScore(1200, 1200);
    const updatedRating = newRating(1200, expected, 0);

    expect(updatedRating).toBe(1184);
  });

  it("keeps rating unchanged after a draw between equal players", () => {
    const expected = expectedScore(1200, 1200);
    const updatedRating = newRating(1200, expected, 0.5);

    expect(updatedRating).toBe(1200);
  });
});
