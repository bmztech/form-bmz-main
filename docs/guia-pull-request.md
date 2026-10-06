# Padrão para criar Pull Requests

Atualizado em 06/10/2026

Este guia define como abrir PRs no repo [bmztech/form-previdenci-rio](https://github.com/bmztech/form-previdenci-rio). A branch `develop` é a de desenvolvimento e a `main` é a de produção. Um merge na `main` publica o form.bmzadvogados.com, então o cuidado com esse PR é maior.

> **Migração em andamento.** Até 06/10/2026 o modelo era `main` para desenvolvimento e `prod` para produção. Veja a seção "Migração do modelo antigo" no fim deste guia. Enquanto ela não terminar, o deploy da Hostinger ainda lê a `prod`.

## Regra principal

**Toda atualização nasce numa branch nova**, criada a partir da `develop` atualizada, e só chega à `develop` por PR. A regra vale para qualquer mudança, inclusive troca de número, ajuste de texto e correção de uma linha.

- **Uma branch por atualização.** Não reaproveite uma branch já mergeada e não junte dois assuntos na mesma.
- **Nunca faça commit direto na `develop` nem na `main`.**
- **Apague a branch** depois do merge.

```bash
git switch develop
git pull origin develop
git switch -c fix/numero-whatsapp-adic25   # uma branch nova por atualização

# faça a mudança e os commits
git push -u origin fix/numero-whatsapp-adic25
gh pr create --base develop --title "fix: atualiza número do adic-25" --body-file pr.md
```

Enquanto a `develop` não existir, a base é a `main`. Veja "Migração do modelo antigo" no fim deste guia.

## Fluxo das branches

| Branch | Papel | Quem escreve nela |
| --- | --- | --- |
| `develop` | Desenvolvimento. Recebe todo trabalho novo. | Só por PR |
| `main` | Produção. Cada merge dispara um deploy na Hostinger. | Só por PR vindo da `develop`, ou de um `hotfix` |
| `feat/...`, `fix/...` | Uma atualização. Nasce da `develop` e morre no merge. | Quem faz a mudança |

```
feat/minha-mudanca ──PR──► develop ──PR──► main ──► deploy na Hostinger
```

- **Nunca faça commit direto na `main` nem na `develop`.** O histórico tem vários PRs de volta e branches `sync/prod-to-main`. Eles existem porque alguém mexeu direto na branch de produção e a de desenvolvimento ficou para trás.
- **Sem exceção para número de WhatsApp.** Troca de número também passa pela `develop` e depois pela `main`.
- **Urgência:** crie `hotfix/...` a partir da `main`, abra PR para a `main` e, logo depois, um PR `main` para `develop` com o nome `sync/main-to-develop`. A `develop` precisa receber a correção no mesmo dia.

## Dois tipos de PR

| Tipo | Origem | Destino | Quando |
| --- | --- | --- | --- |
| Mudança | `feat/...` ou `fix/...` | `develop` | Todo trabalho novo |
| Release | `develop` | `main` | Quando as mudanças da `develop` estão validadas e podem ir ao ar |

Um PR de release não traz código novo. Ele só leva para a `main` o que já passou pela `develop`.

## Nome da branch

```
<tipo>/<assunto-curto-em-kebab-case>
```

| Tipo | Uso | Exemplo |
| --- | --- | --- |
| `feat` | Funcionalidade ou funil novo | `feat/post-lead-to-db` |
| `fix` | Correção, incluindo troca de número e de texto | `fix/numero-whatsapp-adic25` |
| `hotfix` | Correção urgente a partir da `main` | `hotfix/build-webpack` |
| `chore` | Dependências, configuração, limpeza | `chore/atualiza-next` |
| `docs` | Só documentação | `docs/guia-pull-request` |
| `sync` | Trazer a `main` de volta para a `develop` | `sync/main-to-develop` |

## Commits e título do PR

Use o padrão Conventional Commits, em português, no imperativo e com a primeira letra minúscula:

```
<tipo>(<escopo opcional>): <o que mudou>
```

Exemplos reais do repo:

- `feat: envia lead pro webhook do BI no clique final do funil`
- `fix: renomeia opção de região pra "Outra região" pra automação do WhatsApp identificar`
- `fix(build): usa webpack no build, turbopack falha no PostCSS da Hostinger`

Regras:

- O **título do PR** segue o mesmo formato do commit principal.
- **Evite** títulos como "update numbers form assistance and accident" ou "Fix: Número Time 2". Não dizem o que mudou nem o motivo.
- Um commit por assunto. Não misture troca de número com mudança de pergunta.
- No corpo do commit, explique o **porquê** quando não for óbvio.

## Antes de abrir o PR

Rode na sua máquina e só abra o PR se tudo passar:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

O `npm run build` usa Webpack. O Turbopack falhou no build da Hostinger em 05/10/2026. Veja o doc de arquitetura, na seção de problemas conhecidos.

Verificações extras conforme o que você mudou:

| Se você mudou | Confira também |
| --- | --- |
| Número de WhatsApp | Abra `/aux-a`, `/aux-b`, `/aux-c` e `/adic-25`, vá até a tela final e veja o número no link do botão |
| Perguntas ou ramificação em `form.ts` | Rode a skill `preview-mensagem` e cole a mensagem gerada no PR. Percorra um caminho de desqualificação. |
| Mensagem do WhatsApp | A automação do WhatsApp lê textos como "Outra região". Avise quem mantém o fluxo antes de renomear. |
| Funil novo | Siga o roteiro da skill `novo-funil` e atualize a tabela de rotas no README |
| Webhook do BI ou variáveis de ambiente | Nunca coloque token ou URL secreta no código. Veja a seção de segurança abaixo. |
| UTMs ou Meta Pixel | Teste com `?utm_source=...` e confira o pixel na extensão Meta Pixel Helper |
| Dependências | Leia `node_modules/next/dist/docs/` se mexer no Next.js. Esta versão tem mudanças que quebram APIs antigas. |

## Descrição do PR

Use o modelo abaixo. Apague as linhas que não se aplicam, mas mantenha as seções **O que mudou**, **Por quê** e **Como testar**.

### Modelo: PR de mudança, para a `develop`

```markdown
## O que mudou
- <mudança 1, em uma linha>
- <mudança 2>

## Por quê
<motivo ou pedido de negócio. Cole o link da tarefa ou da conversa, se houver.>

## Como testar
1. <passo>
2. <resultado esperado>

## Rotas afetadas
- [ ] `/` (linktree)
- [ ] `/aux-a`, `/aux-b`, `/aux-c`
- [ ] `/adic-25`
- [ ] `/api/lead-webhook`
- [ ] Nenhuma rota, só configuração ou documentação

## Checklist
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test` e `npm run build` passam
- [ ] Testei no navegador as rotas afetadas
- [ ] Nenhum token, senha ou URL privada no código
- [ ] README ou docs atualizados, se a mudança altera o que eles dizem
- [ ] Avisei quem mantém a automação do WhatsApp, se mudei um texto de opção

## Evidência
<print da tela, link da prévia ou a mensagem de WhatsApp gerada>
```

### Modelo: PR de release, de `develop` para `main`

```markdown
## Release
Título: `release: <resumo em uma linha>`

## O que vai ao ar
- #<número do PR>: <título>
- #<número do PR>: <título>

## Impacto em produção
- Rotas afetadas: <lista>
- Muda número de WhatsApp: sim ou não
- Muda variável de ambiente na Hostinger: sim ou não

## Antes do merge
- [ ] Tudo que está na `develop` foi validado
- [ ] `npm run build` passa na `develop`
- [ ] Variáveis de ambiente novas já estão configuradas na Hostinger

## Depois do merge
- [ ] Acompanhei o build em Implantações do site **form.bmzadvogados.com** até ficar Concluído
- [ ] Abri a rota com `?x=1` e confirmei a mudança no ar
- [ ] Se a URL limpa ainda mostrar a versão antiga, limpei o cache da CDN
```

## Criar o PR pela linha de comando

Com o GitHub CLI:

```bash
# PR de mudança
git push -u origin feat/minha-mudanca
gh pr create --base develop --title "feat: o que mudou" --body-file pr.md

# PR de release
gh pr create --base main --head develop --title "release: resumo" --body-file release.md
```

Salve a descrição preenchida em `pr.md` ou `release.md`, fora do repo, e passe com `--body-file`.

## Revisão e merge

- **Mudança para a `develop`:** peça revisão a uma pessoa do time. Para uma troca simples de número ou de texto, o autor pode fazer o merge depois de conferir a tela final.
- **Release para a `main`:** quem faz o merge confere antes a lista de mudanças e o impacto em produção. Faça o merge em horário em que dê para acompanhar o build.
- **Método de merge:** use **merge commit**, como nos PRs já feitos (#4, #5, #8, #11). Ele deixa o PR visível no histórico. Não use squash na release, para a `develop` e a `main` não divergirem.
- **Apague a branch** do trabalho depois do merge. Nunca apague a `develop` nem a `main`.

## Depois do merge na `main`

1. Abra o hPanel, entre no site **form.bmzadvogados.com** (não no previdenciario) e veja Implantações.
2. Espere o build ficar **Concluído**. Um build com falha não derruba o site, mas a versão antiga continua no ar.
3. Abra a rota alterada com `?x=1` para furar o cache e confirme a mudança.
4. Se o build falhou, não faça merge de novo para tentar. Leia o log do build e corrija em um novo PR.

## Segurança

- **Nunca** versione token, senha, chave de API ou URL privada. A única exceção conhecida é o fallback do webhook do BI em `src/app/api/lead-webhook/route.ts`, mantido por decisão do time porque o `.env` da Hostinger já falhou em produção. Não crie outras exceções.
- O ID do Meta Pixel **não** é segredo e pode ficar no código. O token do webhook e o token da API de Conversões, se vier a existir, são segredos e vão em variável de ambiente.
- Se um segredo for commitado por engano, avise o time na hora. Apagar o commit depois não basta, é preciso rotacionar o segredo.

## Migração do modelo antigo

Situação verificada em 06/10/2026:

- A `main` e a `prod` têm **o mesmo conteúdo** desde o PR #14. Trocar o deploy para a `main` não muda o que está no ar.
- A branch `develop` **ainda não existe** no GitHub.
- O site form.bmzadvogados.com na Hostinger clona a branch `prod`. Os builds de 05/10 mostram isso.

Passos, nesta ordem:

1. **Criar a `develop`** a partir da `main`.
2. **Trocar a branch de implantação** do site form.bmzadvogados.com na Hostinger de `prod` para `main`. Confira também a implantação automática, se estiver ligada. Depois, faça um build e confirme que ficou Concluído.
3. **No GitHub, definir a `develop` como branch padrão**, para os PRs novos nascerem apontando para ela, e **proteger a `main`** contra push direto, exigindo PR.
4. **Aposentar a `prod`** depois de alguns deploys estáveis pela `main`. Não a use mais, e apague quando o time concordar.
5. **Avisar o time** e fechar os PRs e branches antigos que apontam para `prod`, como `sync/prod-to-main`.

Esta migração vale só para este repo. O site previdenciario.bmzadvogados.adv.br tem outro repo, o `form-prev-mql-kommo`, que segue o próprio fluxo e continua publicando pela `prod`.

## Resumo rápido

1. Atualize a `develop` e crie uma branch nova, `feat/...` ou `fix/...`, para esta atualização.
2. Faça commits no formato `tipo: o que mudou`.
3. Rode lint, tipos, testes e build.
4. Abra o PR para a `develop` com o modelo de mudança.
5. Depois de validado, abra o PR de `develop` para `main` com o modelo de release.
6. Faça o merge com merge commit e acompanhe o build na Hostinger.
