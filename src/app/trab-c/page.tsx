import type { Metadata } from "next";
import FunnelTrabalhista from "@/components/FunnelTrabalhista";
import { WHATSAPP_NUMBERS } from "@/lib/trabalhista/config";

// Sobrescreve o metadata do layout raiz (que é do funil aux-acidente).
export const metadata: Metadata = {
  title: "Indenização por Acidente de Trabalho | BMZ Advogados",
  description:
    "Sofreu um acidente de trabalho e ficou com sequelas? Veja se você pode ter direito a uma indenização da empresa.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FunnelTrabalhista whatsappNumber={WHATSAPP_NUMBERS.c} />;
}
