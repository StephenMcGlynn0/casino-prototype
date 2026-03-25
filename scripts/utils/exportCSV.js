const fs = require("fs");
const path = require("path");

function exportToCSV(stats, filename = "results.csv") {
  // Ensure output folder exists
  const outputDir = path.join(__dirname, "../output");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const fullPath = path.join(outputDir, filename);

  let csv = "Card,Games,Wins,Losses,Pushes,EmpiricalRaw,EmpiricalCond,TheoryRaw,TheoryCond\n";

  for (let v = 1; v <= 13; v++) {
    const s = stats[v];

    const empiricalRaw = s.total ? s.wins / s.total : 0;
    const empiricalCond = (s.wins + s.losses)
      ? s.wins / (s.wins + s.losses)
      : 0;

    const theoryRaw = (4 * Math.max(v - 1, 13 - v)) / 51;
    const theoryCond = Math.max(v - 1, 13 - v) / 12;

    csv += `${v},${s.total},${s.wins},${s.losses},${s.ties},${empiricalRaw},${empiricalCond},${theoryRaw},${theoryCond}\n`;
  }

  fs.writeFileSync(fullPath, csv);

  console.log(`\n📄 CSV exported: ${fullPath}`);
}

module.exports = { exportToCSV };