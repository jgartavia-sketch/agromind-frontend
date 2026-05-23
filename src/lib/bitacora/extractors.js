import { KNOWN_CROPS, KNOWN_ZONES } from "./dictionary";

export function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

export function extractMoney(text) {
  return String(text || "").match(/₡\s?[\d.,]+|crc\s?[\d.,]+|colones\s?[\d.,]+/gi) || [];
}

export function parseMoneyValue(value) {
  const clean = String(value || "")
    .replace(/₡|crc|colones/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function extractNumbers(text) {
  return String(text || "").match(/\b\d+([.,]\d+)?\b/g) || [];
}

export function extractDetectedItems(cleanText, list) {
  return uniqueItems(list.filter((item) => cleanText.includes(normalizeText(item))));
}

export function extractCrops(cleanText) {
  return extractDetectedItems(cleanText, KNOWN_CROPS);
}

export function extractZones(cleanText) {
  return extractDetectedItems(cleanText, KNOWN_ZONES);
}

export function extractHours(cleanText) {
  const results = [];

  const numericMatches = cleanText.match(/(\d+([.,]\d+)?)\s*(hora|horas|hr|hrs|h)\b/g) || [];
  numericMatches.forEach((item) => {
    const number = item.match(/\d+([.,]\d+)?/)?.[0];
    if (number) results.push(Number(number.replace(",", ".")));
  });

  if (cleanText.includes("media hora")) results.push(0.5);
  if (cleanText.includes("una hora")) results.push(1);
  if (cleanText.includes("dos horas")) results.push(2);
  if (cleanText.includes("tres horas")) results.push(3);
  if (cleanText.includes("cuatro horas")) results.push(4);
  if (cleanText.includes("cinco horas")) results.push(5);
  if (cleanText.includes("seis horas")) results.push(6);

  return results.filter((value) => Number.isFinite(value));
}

export function extractLiters(cleanText) {
  const results = [];

  const numericMatches = cleanText.match(/(\d+([.,]\d+)?)\s*(litro|litros|l)\b/g) || [];
  numericMatches.forEach((item) => {
    const number = item.match(/\d+([.,]\d+)?/)?.[0];
    if (number) results.push(Number(number.replace(",", ".")));
  });

  if (cleanText.includes("medio litro")) results.push(0.5);
  if (cleanText.includes("un litro") || cleanText.includes("1 litro")) results.push(1);
  if (cleanText.includes("litro y medio")) results.push(1.5);
  if (cleanText.includes("dos litros")) results.push(2);
  if (cleanText.includes("tres litros")) results.push(3);

  return results.filter((value) => Number.isFinite(value));
}

export function extractUnits(cleanText) {
  const unitPatterns = [
    "plantas", "plántulas", "plantulas", "semillas", "sacos", "bolsas",
    "kilos", "kg", "cajas", "canastas", "litros", "horas", "metros"
  ];

  return unitPatterns.filter((unit) => cleanText.includes(normalizeText(unit)));
}