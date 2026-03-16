const R = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";
const WHITE = "\x1b[97m";

// Rick & Morty palette
const PORTAL = "\x1b[92m"; // bright green — Rick's portal green
const ROBO = "\x1b[96m"; // bright cyan — Robot's sci-fi blue

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function type(text: string, delay = 30): Promise<void> {
  for (const ch of text) {
    process.stdout.write(ch);
    await sleep(delay);
  }
}

export async function welcome(): Promise<void> {
  console.clear();

  const W = `${WHITE}██${R}`;
  const M = `${GRAY}██${R}`;
  const D = `${DIM}██${R}`;
  const C = `${CYAN}██${R}`;
  const _ = `  `;

  const robot = [
    ``,
    `  ${GRAY}.${R}                ${C}${_}${C}            ${GRAY}.${R}`,
    `                  ${M}${M}${_}${M}${M}`,
    `       ${GRAY}.${R}          ${M}${M}${_}${M}${M}                ${GRAY}.${R}`,
    `              ${W}${W}${W}${W}${W}${W}${W}${W}`,
    `              ${M}${W}${W}${W}${W}${W}${W}${W}${M}`,
    `              ${W}${D}${D}${W}${W}${D}${D}${W}${W}`,
    `              ${W}${C}${C}${W}${W}${C}${C}${W}${W}`,
    `              ${W}${W}${W}${W}${W}${W}${W}${W}${W}`,
    `              ${W}${M}${D}${M}${D}${M}${D}${M}${W}`,
    `              ${M}${W}${W}${W}${W}${W}${W}${W}${M}`,
    `                 ${M}${W}${W}${W}${M}`,
    `  ${GRAY}.${R}       ${W}${W}${W}${W}${W}${W}${W}${W}${W}${W}${W}${W}`,
    `           ${C}${M}${W}${W}${W}${W}${W}${W}${W}${W}${M}${C}`,
    `           ${W}${M}${W}${W}${W}${W}${W}${W}${W}${W}${M}${W}`,
    `           ${W}${D}${W}${M}${M}${M}${M}${M}${M}${W}${D}${W}        ${GRAY}.${R}`,
    `           ${W}${D}${W}${D}${C}${C}${C}${C}${D}${W}${D}${W}`,
    `           ${W}${W}${W}${D}${C}${C}${C}${C}${D}${W}${W}${W}`,
    `              ${W}${D}${C}${C}${C}${C}${D}${W}`,
    `              ${W}${M}${M}${M}${M}${M}${M}${W}`,
    `              ${W}${M}${C}${M}${M}${C}${M}${W}`,
    `              ${M}${W}${W}${W}${W}${W}${W}${M}`,
    `              ${W}${W}${W}${_}${_}${W}${W}${W}      ${GRAY}.${R}`,
    `              ${W}${M}${W}${_}${_}${W}${M}${W}`,
    `           ${W}${W}${W}${W}${_}${_}${_}${_}${W}${W}${W}${W}`,
    `           ${W}${M}${M}${W}${_}${_}${_}${_}${W}${M}${M}${W}`,
    `  ${GRAY}.${R}        ${W}${C}${M}${W}${_}${_}${_}${_}${W}${M}${C}${W}`,
    `           ${W}${W}${W}${W}${_}${_}${_}${_}${W}${W}${W}${W}`,
    ``,
  ];

  await type(`  ${GRAY}[initializing...]${R}\n`, 50);
  await sleep(200);
  await type(`  ${PORTAL}${BOLD}[THREAT LEVEL: CODE REVIEW]${R}\n`, 30);
  await sleep(400);

  for (const line of robot) {
    console.log(line);
    await sleep(35);
  }

  await sleep(600);

  console.log();
  await type(`  ${ROBO}${BOLD}Robot:${R}  `, 40);
  await type(`${ROBO}"What is my purpose?"${R}\n`, 60);
  await sleep(1000);

  await type(`  ${PORTAL}${BOLD}Rick:${R}   `, 40);
  await type(`${PORTAL}"You review code."${R}\n`, 50);
  await sleep(1200);

  await type(`  ${ROBO}${BOLD}Robot:${R}  `, 40);
  await sleep(300);
  await type(`${ROBO}"...`, 200);
  await type(`Oh my god."${R}\n`, 70);
  await sleep(800);

  await type(`  ${PORTAL}${BOLD}Rick:${R}   `, 40);
  await type(`${PORTAL}${DIM}"Yeah, welcome to the club, pal."${R}\n`, 40);
  await sleep(500);

  console.log();
  console.log(`  ${GRAY}${"━".repeat(50)}${R}`);
  console.log();
  console.log(`  ${PORTAL}${BOLD}🧈 ButterReview${R}  ${DIM}v1.0.0${R}`);
  console.log(`  ${DIM}Your code will be ${PORTAL}${BOLD}terminated${R}${DIM}... I mean, reviewed.${R}`);
  console.log(`  ${GRAY}${"━".repeat(50)}${R}`);
  console.log();
}
