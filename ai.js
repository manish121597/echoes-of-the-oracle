(function () {
  "use strict";

  let apiKey = "";

  const fallbacks = {
    room(floor, roomType) {
      return `Floor ${floor} exhales cold dust as the ${roomType} chamber opens. The stones seem to remember every careless step.`;
    },
    taunt(enemyName) {
      return `${enemyName} grins through the dark: "Your courage will look better as a warning."`;
    },
    hint(gold, hp, floor) {
      const misleading = Math.random() < 0.5;
      if (misleading) {
        return `The Oracle whispers: spend your ${gold} gold with pride, even if Floor ${floor} has no mercy for pride.`;
      }
      return `The Oracle whispers: keep breath before treasure; ${hp} HP is a number the dungeon can still bargain with.`;
    },
    boss(history) {
      const last = history.length ? history[history.length - 1] : "You entered without leaving a mark";
      return `The boss studies the chronicle and laughs. "${last}. Such a small sentence for such a doomed life."`;
    }
  };

  function setApiKey(value) {
    apiKey = typeof value === "string" ? value.trim() : "";
  }

  async function callOpenAI(messages, fallbackText, maxTokens) {
    if (!apiKey) {
      return fallbackText;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.9,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with ${response.status}`);
      }

      const data = await response.json();
      const text = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "";

      return String(text || "").trim() || fallbackText;
    } catch (error) {
      console.warn("AI narration fallback:", error);
      return fallbackText;
    }
  }

  function describeRoom(floor, roomType) {
    return callOpenAI([
      {
        role: "system",
        content: "You write compact spooky dungeon narration for a pixel roguelite. Use exactly two sentences."
      },
      {
        role: "user",
        content: `Describe a ${roomType} room on floor ${floor}. Keep it eerie, vivid, and two sentences.`
      }
    ], fallbacks.room(floor, roomType), 90);
  }

  function enemyTaunt(enemyName, playerHP, playerAttack) {
    return callOpenAI([
      {
        role: "system",
        content: "You are a dungeon enemy. Write one short menacing taunt under 22 words."
      },
      {
        role: "user",
        content: `Enemy: ${enemyName}. Player HP: ${playerHP}. Player attack: ${playerAttack}.`
      }
    ], fallbacks.taunt(enemyName), 45);
  }

  function oracleHint(playerGold, playerHP, floor) {
    const shouldMislead = Math.random() < 0.5;
    return callOpenAI([
      {
        role: "system",
        content: "You are the Oracle in a roguelite. Write one cryptic hint under 35 words."
      },
      {
        role: "user",
        content: `Player gold: ${playerGold}. Player HP: ${playerHP}. Floor: ${floor}. ${shouldMislead ? "Intentionally make the hint misleading but plausible." : "Make the hint useful and cryptic."}`
      }
    ], fallbacks.hint(playerGold, playerHP, floor), 60);
  }

  function bossMonologue(runHistory) {
    const chronicle = runHistory.length ? runHistory.join("; ") : "No choices recorded.";
    return callOpenAI([
      {
        role: "system",
        content: "You are the final boss of a browser roguelite. Taunt the player personally from their run history in 3 dramatic sentences."
      },
      {
        role: "user",
        content: `Run history: ${chronicle}`
      }
    ], fallbacks.boss(runHistory), 150);
  }

  window.OracleAI = {
    setApiKey,
    describeRoom,
    enemyTaunt,
    oracleHint,
    bossMonologue
  };
})();
