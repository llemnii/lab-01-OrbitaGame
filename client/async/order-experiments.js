export async function runOrderExperiments(log = console.log) {
  const result = [];
  log("1");
  await Promise.resolve();
  log("2");
  result.push("1 3 2");

  log("3");
  Promise.resolve().then(() => log("5"));
  setTimeout(() => log("6"), 0);
  log("4");
  result.push("3 4 5 6");

  log("7");
  Promise.resolve().then(() => setTimeout(() => log("9"), 0));
  log("8");
  result.push("7 8 9");

  log("10");
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => log("12"));
  Promise.resolve().then(() => log("11"));
  result.push("10 11 12");

  await Promise.all([Promise.resolve("13"), Promise.resolve("14")]).then(() => log("15"));
  result.push("13 14 15");

  await new Promise((resolve) => setTimeout(resolve, 0));
  return result;
}
