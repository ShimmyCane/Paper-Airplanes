// Supabase connection for the browser (the shared Family project). The publishable key is meant to be public;
// pa_flights only opens to the signed-in family account (RLS). SQL: supabase/001_flights.sql (paste it in by hand).
window.APP_CONFIG = {
  app: "paper-airplanes",
  version: "0.6.0",
  prefix: "pa",
  table: "pa_flights",
  extraCols: ["distance_ft", "seconds", "path"],
  url: "https://twvqvutrcobedvuhnzxq.supabase.co",
  key: "sb_publishable_eqUo8HEdEB1hMQM4CpSVqA_9i6b0qCo",
  timeoutMs: 8000,
  links: [["index.html", "🏠 Home"], ["build.html", "🛠️ Build"], ["fly.html", "✈️ Fly"], ["design.html", "✏️ Design"], ["photo.html", "📸 Photo booth"], ["research/index.html", "🔭 How planes fly"], ["v1/index.html", "📦 V1 archive"]]
};
