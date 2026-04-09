export function templateNarrative(
  name: string,
  age: number,
  eventTitles: string[]
): string {
  const bits = eventTitles.join("；");
  return `${name} 在 ${age} 岁这一年：${bits}。日子还得过。`;
}
