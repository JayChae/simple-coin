const hexToBinary = (hex: string): string | null => {
  // Input validation
  if (!hex || typeof hex !== "string") {
    return null;
  }

  // Normalize to lowercase for consistent lookup
  const normalizedHex = hex.toLowerCase();

  // Lookup table for hex to binary conversion
  const lookupTable: Record<string, string> = {
    "0": "0000",
    "1": "0001",
    "2": "0010",
    "3": "0011",
    "4": "0100",
    "5": "0101",
    "6": "0110",
    "7": "0111",
    "8": "1000",
    "9": "1001",
    a: "1010",
    b: "1011",
    c: "1100",
    d: "1101",
    e: "1110",
    f: "1111",
  };

  let result = "";

  // Convert each hex character to binary
  for (const char of normalizedHex) {
    const binary = lookupTable[char];
    if (!binary) {
      return null; // Invalid hex character
    }
    result += binary;
  }

  return result;
};

export { hexToBinary };
