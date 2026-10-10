# Форматы контента

## Порядок сцен

`prologue → portfolio → resume → jobs → test → interview → labor → first-day`

Единственная петля: `interview` при неудаче возвращает в `jobs`.

## Подстановки в тексте

| Токен | Значение |
|---|---|
| `{playerName}` | имя, введённое в главном меню |
| `{g:мужская\|женская}` | форма слова по выбранному персонажу: `{g:закончил\|закончила}` |
| `{specialtyTitle}` | название специальности из резюме |
| `{resumePercent}` | процент заполнения резюме |
| `{position}`, `{company}` | должность и компания из принятой вакансии |
| `{resumeQuality}`, `{topTraits}` | вычисляются на финальном экране |

## Типы узлов

| type | Что делает | Обязательные поля |
|---|---|---|
| `say` | реплика персонажа | `who`, `text` |
| `think` | внутренний голос игрока | `text` |
| `narrate` | текст без говорящего | `text` |
| `chapter` | заставка главы | `title`, `text` |
| `choice` | выбор из вариантов | `options[]` |
| `branch` | ветвление по состоянию | `on`, `cases` |
| `screen` | специальный экран | `screen` |
| `card` | карточка полученного знания | `icon`, `title` |
| `quiz` | мини-тест с вариантами | `questions[]`, `results[]` |
| `minigame` | задание с вариантами действий | `variants[]`, `options[]` |
| `results` | таблица итогов | `rows[]` |
| `award` | выдать достижение | `achievement` |
| `goto` | переход в другую сцену | `scene` |

`who` — id из `characters.json` либо `player` (подставляется выбранный персонаж).
`emotion` — одно из `neutral`, `smile`, `joy`, `worry`, `stern`.
`background` на узле временно меняет фон до конца сцены.

## Поля варианта выбора

```json
{
  "text": "то, что видит игрок",
  "score": 1,
  "effects": { "energy": 2, "mood": 1 },
  "set": { "style": "active" },
  "award": "id-достижения",
  "reply": { "who": "kurator", "emotion": "joy", "text": "ответ на выбор" },
  "note": "комментарий для команды, в игре не показывается"
}
```

`effects` — шкалы: `energy`, `mood`, `confidence`, `reputation`, `law`,
`responsibility`, `awareness`, `risk`.
`set` — флаги: `style`, `approach`, `portfolio`, `contract`, `readContract`,
`signedBlind`.
`score` — только в сцене собеседования, значения `1`, `0`, `-1`.

## Проверка

```bash
node tools/validate.mjs
```
