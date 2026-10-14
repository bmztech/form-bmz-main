---
name: preview-mensagem
description: Gera e mostra a mensagem de WhatsApp que um funil produziria para um caminho de respostas de exemplo, sem precisar abrir o navegador. Use quando o usuário pedir para conferir/testar/ver como fica a mensagem do WhatsApp depois de mexer em src/lib/<funil>/form.ts ou whatsapp.ts, ou pedir um preview do funil.
---

# Preview da mensagem de WhatsApp

Os funis deste repo são 100% client-side (ver `README.md`) — não há como
"chamar uma API" pra ver a mensagem gerada. Mas `buildMessage` e
`buildWhatsAppUrl` (em `src/lib/<funil>/whatsapp.ts`) são funções puras: dado
um objeto `answers` e um objeto `tracking`, devolvem a string exata que vai
pro WhatsApp. Este skill roda essas funções diretamente via Vitest (já é
dependência do projeto — `vitest.config.ts` resolve os aliases `@/*` via
`tsconfigPaths`), sem precisar subir o dev server nem clicar em cada tela.

## Passos

1. **Identifique qual funil** o usuário quer testar (`aux-acidente/` do funil
   original, `adic25/`, ou outra pasta criada depois — ver a tabela
   "Formulários existentes" no `README.md`; cada funil vive em
   `src/lib/<slug>/`).

2. **Monte um objeto `answers`** que representa um caminho válido pelo
   funil. Se o usuário não especificar respostas, use `STEPS` do
   `src/lib/<slug>/form.ts` correspondente para montar um caminho completo
   plausível (primeira opção de cada `choice`, um texto de exemplo em cada
   `text`/`phone`) — preste atenção nos `next` condicionais pra não incluir
   respostas de um ramo que não seria visitado. Se o usuário pedir um
   caminho específico (ex.: "o caminho de quem é MEI e nega no INSS"), monte
   `answers` seguindo esse ramo.

3. **Escreva um arquivo de teste temporário** em
   `src/lib/<slug>/__preview.test.ts` (dentro da pasta do funil, pra poder
   importar com caminho relativo; é descartável — apague no fim). Exemplo
   para o funil original (`src/lib/aux-acidente/__preview.test.ts`):

   ```ts
   import { describe, it } from "vitest";
   import { buildMessage, buildWhatsAppUrl } from "./whatsapp";
   import type { Answers } from "./form";

   describe("preview", () => {
     it("mostra a mensagem gerada", () => {
       const answers: Answers = {
         nome: "Exemplo da Silva",
         sequela: "sim",
         vinculo: "carteira",
         inss: "afastado",
         whatsapp: "(41) 99999-0000",
         tipoLesao: "limitacao",
         regiao: "braco",
         lesao: "fratura de exemplo",
       };
       const tracking = { utm_source: "preview", utm_campaign: "teste" };

       console.log("\n--- MENSAGEM ---\n" + buildMessage(answers, tracking));
       console.log("\n--- URL ---\n" + buildWhatsAppUrl(answers, tracking));
     });
   });
   ```

   Para outro funil, crie o arquivo dentro da pasta dele
   (`src/lib/<slug>/__preview.test.ts`) — os imports `./whatsapp` e `./form`
   continuam relativos e não mudam. Só ajuste o objeto `answers` para os
   `id`s daquele `STEPS`.

4. **Rode** `npx vitest run src/lib/<slug>/__preview.test.ts --reporter=verbose`
   e leia o `console.log` na saída — é exatamente o texto que cairia no campo
   de mensagem do WhatsApp (já com `encodeURIComponent` desfeito, porque é o
   `buildMessage` cru; a URL mostrada é o link final com a mensagem
   codificada). **O `--reporter=verbose` é obrigatório**: o reporter padrão
   do Vitest esconde `console.log` de testes que passam.

5. **Apague o arquivo temporário** (`src/lib/<slug>/__preview.test.ts`)
   depois de mostrar o resultado — ele não deve ser commitado. Confira com
   `git status` que não sobrou nada antes de encerrar.

## Coisas a checar no resultado

- **Linhas faltando**: se uma pergunta não aparece na mensagem, confira se
  ela tem `hideInSummary: true` (proposital) ou se o `id` em `answers` não
  bate com o `id` do step em `STEPS` (bug).
- **Cabeçalho estranho**: `buildHeadline` é específico por funil — se o
  texto do "Caso: ..." não fizer sentido, o problema está no
  `<slug>/whatsapp.ts`, não no `<slug>/form.ts`.
- **Frase de `phraseFor` esquisita** (ex.: "na região outra região" em vez de
  "na região afetada"): falta preencher `phrase` na opção correspondente em
  `STEPS`.
- **Bloco `— origem —` ausente**: só aparece se o objeto `tracking` passado
  tiver pelo menos uma chave com valor não vazio — isso é esperado, não é
  bug, se você passou `tracking: {}`.
