# Meta Pixel: como incluir ou trocar o ID

Atualizado em 06/10/2026

O pixel deste repo é um só e vale para todas as rotas do form.bmzadvogados.com. Para trocar ou incluir um ID, você edita um arquivo e publica. Este guia mostra onde, como testar e como lidar com mais de um pixel.

## Como está hoje

| Peça | Arquivo | O que faz |
| --- | --- | --- |
| ID do pixel | `src/lib/meta/pixel.ts` (`META_PIXEL_ID`) | Guarda o ID. É a única fonte. |
| Código base | `src/components/MetaPixel.tsx` | Carrega o script do Meta, faz `fbq('init', ID)` e dispara `PageView`. Inclui o `noscript` com a imagem de 1 pixel. |
| Montagem | `src/app/layout.tsx` | Renderiza `<MetaPixel />` uma vez. Cobre `/`, `/aux-a`, `/aux-b`, `/aux-c` e `/adic-25`. |
| Evento de conversão | `trackLead()` em `src/lib/meta/pixel.ts` | Dispara `Lead` no clique de "Falar com um advogado agora". É chamado em `Funnel.tsx` e em `FunnelAdic25.tsx`. |

ID atual do form.bmzadvogados.com: `1289395722733398`.

Os anúncios do Facebook, Instagram, Messenger e Audience Network usam o mesmo pixel. Ele pertence ao site, não à plataforma de origem do tráfego. Hoje não existe um pixel por rede social. A seção "Vários pixels por plataforma" descreve o plano para separar Instagram, Facebook e TikTok.

## Onde pegar o ID

1. Abra o Gerenciador de Eventos do Meta, em [business.facebook.com/events_manager](https://business.facebook.com/events_manager).
2. Escolha a conta de anúncios da BMZ e a fonte de dados do tipo Pixel.
3. Copie o **ID do conjunto de dados**, que tem 15 ou 16 dígitos.

O ID do pixel é público e aparece no código de qualquer página. Não é segredo e pode ficar no repositório.

## Trocar o ID do pixel

1. Edite `src/lib/meta/pixel.ts` e troque o valor:
    ```ts
    export const META_PIXEL_ID = "NOVO_ID_AQUI";
    ```
2. Não mexa em mais nada. O `MetaPixel.tsx` lê o ID dessa constante, tanto no script quanto no `noscript`.
3. Rode `npm run lint` e `npm run build`.
4. Faça commit numa branch `feat/...` ou `fix/...` e abra o PR para a `develop`. Depois de validado, abra o PR da `develop` para a `main`. O merge na `main` publica a mudança na Hostinger.
5. Siga a seção "Como testar" abaixo.

## Incluir um segundo pixel

Use quando duas contas de anúncios precisam receber **os mesmos eventos**, todo o tráfego nos dois. Hoje isso **não está implementado**. Para separar por plataforma de origem, use a próxima seção. É preciso alterar três pontos.

1. Em `src/lib/meta/pixel.ts`, troque a constante por uma lista:
    ```ts
    export const META_PIXEL_IDS = ["1289395722733398", "NOVO_ID_AQUI"];
    ```
2. Em `src/components/MetaPixel.tsx`, faça um `fbq('init', ...)` para cada ID. O `PageView` é disparado uma vez e vai para todos os pixels iniciados:
    ```js
    fbq('init', '1289395722733398');
    fbq('init', 'NOVO_ID_AQUI');
    fbq('track', 'PageView');
    ```
3. Ainda no `MetaPixel.tsx`, repita a imagem do `noscript` para cada ID.

O `trackLead()` já funciona sem mudança. Com vários pixels iniciados, `fbq('track', 'Lead')` envia para todos. Para mandar um evento a um pixel específico, use `fbq('trackSingle', 'ID', 'Lead')`.

## Vários pixels por plataforma (Instagram, Facebook, TikTok)

Este é o plano para quando cada plataforma tiver o seu ID. Hoje **não está implementado**. O código abaixo é um modelo para quem for construir.

### Antes de decidir

- **TikTok não é Meta.** Ele tem pixel próprio, com outro script (`ttq`), outro painel (TikTok Events Manager) e outros nomes de evento. O `fbq` não envia nada para ele. Na prática são dois conjuntos de código: um para o Meta e um para o TikTok.
- **Instagram e Facebook costumam usar o mesmo pixel.** O Meta recomenda um pixel por conta de anúncios. Dividir em dois pixels reparte os dados de otimização e enfraquece o aprendizado das campanhas. Se o objetivo é só comparar Instagram com Facebook, o Gerenciador de Anúncios já separa por posicionamento, sem pixel novo. Dois pixels do Meta só fazem sentido se forem duas contas de anúncios diferentes.

### Como o pixel certo é escolhido

O funil já guarda a origem do lead. `readTracking()` lê `utm_source` da URL e salva em `sessionStorage` na chave `bmz_tracking`. O linktree e o rodízio repassam esse parâmetro até o funil. A regra proposta é: **o `utm_source` do anúncio decide qual pixel carrega**, e esse pixel recebe todos os eventos daquele acesso.

Isso exige combinar os valores com quem monta os anúncios. Sugestão para o `utm_source`:

| Plataforma | Valor sugerido |
| --- | --- |
| Instagram | `instagram` |
| Facebook | `facebook` |
| TikTok | `tiktok` |

O Meta também aceita o parâmetro dinâmico `{{site_source_name}}` nos links dos anúncios, que preenche com `fb`, `ig`, `an` ou `msg`. Se for usado, inclua esses valores na lista de cada pixel. Tráfego sem `utm_source`, ou com um valor desconhecido, cai no **pixel padrão**, para nenhum lead ficar sem medição.

### Modelo da configuração

```ts
// src/lib/meta/pixel.ts (exemplo, ainda não implementado)
type Pixel = {
  id: string;
  platform: "meta" | "tiktok";
  /** Valores de utm_source, em minúsculas, que levam a este pixel. */
  sources: string[];
};

export const PIXELS: Pixel[] = [
  { id: "1289395722733398", platform: "meta", sources: ["facebook", "fb", "instagram", "ig"] },
  { id: "ID_DO_TIKTOK", platform: "tiktok", sources: ["tiktok", "ttk"] },
];

/** Recebe o tráfego sem utm_source ou com valor desconhecido. */
export const DEFAULT_PIXEL = PIXELS[0];

export function pixelFor(utmSource?: string): Pixel {
  const source = utmSource?.toLowerCase();
  return PIXELS.find((p) => source && p.sources.includes(source)) ?? DEFAULT_PIXEL;
}
```

### Pontos do código que mudam

1. **`src/lib/meta/pixel.ts`:** vira a lista de pixels e a função `pixelFor`, como no modelo. O `META_PIXEL_ID` deixa de existir.
2. **`src/components/MetaPixel.tsx`:** deixa de iniciar um ID fixo. O script base lê o `utm_source` da URL e, se não houver, de `bmz_tracking` no `sessionStorage`. Depois escolhe o pixel e inicia **só esse**:
    - Pixel do Meta: `fbq('init', id)` e `fbq('track', 'PageView')`.
    - Pixel do TikTok: carrega o script do TikTok e roda `ttq.load(id)` e `ttq.page()`.
3. **`trackLead()`:** continua sendo o único ponto chamado pelos funis. Ele passa a olhar a plataforma do pixel escolhido e dispara o evento certo:
    - Meta: `fbq('track', 'Lead')`.
    - TikTok: o evento equivalente de lead do TikTok, como `SubmitForm` ou `CompleteRegistration`. Confirme o nome no TikTok Events Manager antes de usar.
4. **`Funnel.tsx` e `FunnelAdic25.tsx`:** não mudam. Eles já chamam `trackLead()`.

Iniciar só o pixel da origem evita mandar o lead do TikTok para a conta do Meta, e o inverso. É diferente de iniciar todos os pixels, que é o caso da seção anterior.

### Limites conhecidos

- **`noscript`:** o servidor não sabe o `utm_source` no `layout.tsx`, então a imagem do `noscript` só pode apontar para o pixel padrão. Quem navega sem JavaScript é uma fração mínima do tráfego.
- **Sessão da aba:** a origem fica salva no `sessionStorage`. Ao testar vários `utm_source` no mesmo navegador, use uma aba anônima nova para cada teste. Sem isso, um acesso sem parâmetro herda a origem do teste anterior.
- **Eventos do TikTok:** os nomes e os parâmetros do TikTok mudam por objetivo de campanha. Valide cada evento no painel dele, como na seção "Como testar".

### Como incluir uma nova plataforma

1. Pegue o ID no painel da plataforma.
2. Inclua uma entrada em `PIXELS` com o ID, a plataforma e os valores de `utm_source`.
3. Combine o valor de `utm_source` com quem monta os anúncios.
4. Teste cada origem em aba anônima:
    ```
    https://form.bmzadvogados.com/adic-25?utm_source=instagram&x=1
    https://form.bmzadvogados.com/adic-25?utm_source=facebook&x=1
    https://form.bmzadvogados.com/adic-25?utm_source=tiktok&x=1
    ```
5. Em cada teste, confirme que **só o pixel daquela origem** aparece na extensão e no painel, e que o `Lead` chega no clique final.

## Um pixel diferente por funil

Também **não está implementado**. Faça só se um funil precisar de outra conta de anúncios. A ideia é o `MetaPixel` receber o ID por prop e cada rota montar o seu, em vez de o `layout.tsx` montar um pixel global. Evite deixar o pixel global ligado junto, para o mesmo acesso não contar duas vezes.

## Como testar

1. Instale a extensão **Meta Pixel Helper** no Chrome.
2. Abra a rota, por exemplo `https://form.bmzadvogados.com/adic-25?x=1`. O parâmetro `?x=1` fura o cache da CDN. A extensão deve mostrar o pixel com o ID novo e o evento `PageView` em verde.
3. No Gerenciador de Eventos, abra a aba **Testar eventos** e informe a URL do site. Os eventos aparecem em poucos segundos.
4. Responda o funil até a tela final e clique em "Falar com um advogado agora". O evento `Lead` deve aparecer.
5. Confira que o `Lead` **não** aparece para quem é desqualificado nem para quem abandona o funil. Isso é o esperado.

O clique navega para o WhatsApp na mesma aba. Se o `Lead` aparecer abaixo do esperado, é possível que o navegador cancele o envio ao sair da página. A alternativa é disparar o evento quando a tela final aparece, dentro de `finish()`. Isso passa a contar também quem vê a tela e não clica.

## Cuidados

- **Ambiente de desenvolvimento dispara de verdade.** O `MetaPixel` não tem proteção por ambiente. Abrir `npm run dev` envia `PageView` para o pixel de produção. Para testar sem sujar os dados, use a aba Testar eventos e ignore o tráfego de localhost, ou use um pixel de teste.
- **Cache da CDN.** As páginas ficam em cache por até um ano. Depois do deploy, a URL limpa pode continuar servindo o ID antigo até o cache ser limpo no hPanel. Confira sempre com `?x=1`.
- **Confirme o build.** Se o último build da Hostinger falhou, o ID antigo continua no ar. Veja o status em Implantações do site form.bmzadvogados.com.
- **Bloqueadores de anúncio.** Eles deixam o `fbq` indefinido. O código usa `window.fbq?.(...)` de propósito, para o formulário funcionar mesmo assim. Não remova o `?.`.

## O outro site: previdenciario.bmzadvogados.adv.br

O site previdenciário é outro projeto, no repo `form-prev-mql-kommo`, feito em Vite. Ele usa **outro pixel**, `1605537040923542`, que está em dois lugares:

| Arquivo | Uso |
| --- | --- |
| `index.html` | Script base e `noscript` com o ID escrito direto |
| `src/lib/config.js` | Constante `META_PIXEL_ID` |

Para trocar o ID lá, edite os dois e faça o deploy da `prod` daquele repo. Nada do que está neste guia altera aquele site.

## Eventos por rota

| Evento | Quando dispara | Rotas |
| --- | --- | --- |
| `PageView` | Toda carga de página | Todas |
| `Lead` | Clique em "Falar com um advogado agora" | `/aux-a`, `/aux-b`, `/aux-c`, `/adic-25` |

O linktree em `/` só registra `PageView`. Para medir cliques nos cards, seria preciso um evento novo, hoje inexistente.
