export const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}

export function sortByDateDesc<T extends { data: { date: Date } }>(items: T[]) {
  return [...items].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function sortByDateAsc<T extends { data: { date: Date } }>(items: T[]) {
  return [...items].sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
}
