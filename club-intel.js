// club-intel.js
module.exports = async function runClubIntel(page) {
  console.log("🚀 Starting Club Intelligence Script");

  // ============================
  // CONFIG (YOU EDIT THESE)
  // ============================
  const startPage = 1;   // 👈 change
  const endPage = 55;   // 👈 change

  // ============================
  // TROPHY MAP
  // ============================
  const TROPHY_MAP = {
    // Lucky Cards (DI)
    18: "Gold Lucky Cards (DI)",
    17: "Silver Lucky Cards (DI)",
    16: "Bronze Lucky Cards (DI)",

    // Lucky Cards ($)
    15: "Gold Lucky Cards ($)",
    14: "Silver Lucky Cards ($)",
    13: "Bronze Lucky Cards ($)",

    // BP
    12: "Gold BP",
    11: "Silver BP",
    10: "Bronze BP",

    // Apartment
    9: "Gold Apartment",
    8: "Silver Apartment",
    7: "Bronze Apartment",

    // Max Energy
    6: "Gold Max Energy",
    5: "Silver Max Energy",
    4: "Bronze Max Energy",

    // Time
    3: "Gold Time",
    2: "Silver Time",
    1: "Bronze Time",
  };

  // ============================
  // PHASE 1 — CLUB URL EXTRACTION
  // ============================
  console.log("📄 Phase 1: Extracting club URLs");

  await page.goto("https://v3.g.ladypopular.com", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  const clubUrls = new Set();

  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    console.log(`🔍 Scanning ranking page ${currentPage}`);

    try {
      const urlsOnPage = await page.evaluate(async (pageNum) => {
        const res = await fetch("/ajax/ranking/clubs.php", {
          method: "POST",
          body: new URLSearchParams({
            action: "getRankingPage",
            page: pageNum.toString(),
          }),
          credentials: "same-origin",
        });

        const data = await res.json();
        if (!data.html) return [];

        const container = document.createElement("div");
        container.innerHTML = data.html;

        const links = container.querySelectorAll(
          'a[href^="/guilds.php?id="]'
        );

        return Array.from(links).map((a) => a.getAttribute("href"));
      }, currentPage);

      urlsOnPage.forEach((url) => clubUrls.add(url));
      console.log(`   ➕ Found ${urlsOnPage.length} clubs`);
    } catch (err) {
      console.log(`❌ Error on page ${currentPage}: ${err.message}`);
    }

    await page.waitForTimeout(1500);
  }

  const clubUrlList = Array.from(clubUrls);
  console.log(`✅ Phase 1 complete. Total clubs collected: ${clubUrlList.length}`);

  // ============================
  // PHASE 2 — CLUB DATA EXTRACTION
  // ============================
  console.log("📊 Phase 2: Extracting club data");

  for (let i = 0; i < clubUrlList.length; i++) {
    const clubUrl = `https://v3.g.ladypopular.com${clubUrlList[i]}`;
    console.log(`\n🏰 Visiting club ${i + 1}/${clubUrlList.length}`);
    console.log(`   🌐 ${clubUrl}`);

    try {
      await page.goto(clubUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForTimeout(2000);

      const clubData = await page.evaluate(() => {
        // ---- Club Name ----
        const nameEl = document.querySelector("#guildName");
        const name = nameEl ? nameEl.textContent.trim() : "Unknown";

        // ---- Fame & Level ----
        const fameEl = document.querySelector("#guildPrestige");
        const levelEl = document.querySelector("#guildLevel");

        const fame = fameEl ? fameEl.textContent.replace(/,/g, "") : null;
        const level = levelEl ? levelEl.textContent : null;

        // ---- Members ----
        let members = null;
        const spanEls = Array.from(document.querySelectorAll("span"));
        const membersSpan = spanEls.find(s =>
          s.textContent.includes("Members:")
        );

        if (membersSpan) {
          const match = membersSpan.textContent.match(/\((\d+)\)/);
          if (match) members = match[1];
        }

        // ---- Trophies ----
        const trophyEls = document.querySelectorAll(
          "#guildTrophies li.trophy"
        );

        const trophies = [];

        trophyEls.forEach((li) => {
          const classes = Array.from(li.classList);
          const trophyClass = classes.find((c) =>
            c.startsWith("trophy-")
          );

          if (trophyClass) {
            const num = parseInt(trophyClass.replace("trophy-", ""), 10);
            if (!isNaN(num)) trophies.push(num);
          }
        });

        return {
          name,
          fame,
          level,
          members,
          trophies,
        };
      });

      // Skip clubs with no trophies
      if (!clubData.trophies || clubData.trophies.length === 0) {
        console.log("⏭️ Skipped (no trophies)");
        continue;
      }

      // Convert trophy numbers → names
      const trophyNames = clubData.trophies.map(
        (num) => TROPHY_MAP[num] || `Unknown Trophy (${num})`
      );

      // ============================
      // TERMINAL OUTPUT
      // ============================
      console.log("🏆 CLUB FOUND");
      console.log(`   📛 Name   : ${clubData.name}`);
      console.log(`   ⭐ Fame   : ${clubData.fame}`);
      console.log(`   🎚️ Level  : ${clubData.level}`);
      console.log(`   👥 Members: ${clubData.members}`);
      console.log(`   🏅 Trophies (${trophyNames.length}):`);
      trophyNames.forEach((t) => console.log(`      • ${t}`));

    } catch (err) {
      console.log(`❌ Error processing club: ${err.message}`);
    }

    await page.waitForTimeout(2000);
  }

  console.log("\n🎉 Club intelligence extraction complete.");
};
