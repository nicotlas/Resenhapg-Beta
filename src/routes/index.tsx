import { createFileRoute } from "@tanstack/react-router";
import { ResenhaGame } from "@/components/game/ResenhaGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RESENHAPG — Protótipo jogável 0.1" },
      {
        name: "description",
        content:
          "Aventura pixel art: comande quatro heróis na Trilha Verde, derrote monstros e encontre a Dona Cleyde.",
      },
      { property: "og:title", content: "RESENHAPG — Protótipo jogável 0.1" },
      {
        property: "og:description",
        content: "Comande quatro aventureiros na Trilha Verde neste RPG pixel art jogável no navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <ResenhaGame />;
}
