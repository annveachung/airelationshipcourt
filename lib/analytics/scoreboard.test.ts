import { describe, expect, it } from "vitest";
import { caseWinner, scoreboard } from "@/lib/analytics/scoreboard";

describe("caseWinner", () => {
  it("gives the case to the partner found less responsible", () => {
    expect(caseWinner({ finalA: 30, finalB: 70 })).toBe("partner_a");
    expect(caseWinner({ finalA: 65, finalB: 35 })).toBe("partner_b");
  });

  it("calls an even split a tie", () => {
    expect(caseWinner({ finalA: 50, finalB: 50 })).toBe("tie");
  });
});

describe("scoreboard", () => {
  it("starts everyone at zero", () => {
    expect(scoreboard([])).toEqual({
      partner_a: { gems: 0, streak: 0 },
      partner_b: { gems: 0, streak: 0 },
    });
  });

  it("counts a gem per win and a streak from the most recent case back", () => {
    // Newest first: A won the last two, B won the one before, A the first.
    expect(scoreboard(["partner_a", "partner_a", "partner_b", "partner_a"])).toEqual({
      partner_a: { gems: 3, streak: 2 },
      partner_b: { gems: 1, streak: 0 },
    });
  });

  it("ends both streaks on a tie without awarding a gem", () => {
    expect(scoreboard(["tie", "partner_b", "partner_b"])).toEqual({
      partner_a: { gems: 0, streak: 0 },
      partner_b: { gems: 2, streak: 0 },
    });
  });

  it("counts an unbroken run of wins as the whole streak", () => {
    expect(scoreboard(["partner_b", "partner_b", "partner_b"]).partner_b).toEqual({ gems: 3, streak: 3 });
  });
});
