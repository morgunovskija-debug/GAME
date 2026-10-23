# Boss Rush

## Crafting and boss summons

After the first boss victory, use **E** or **Summon panel** to choose a fight. The panel lists all five bosses; defeating a boss unlocks the next, and defeated bosses can be fought again. Encounters after a victory start only through the panel.

Defeat the Two-Faced Demon to enter the crafting sanctuary with an accessory station, weapon station, and summon panel. Approach a station and press **E**, or use its on-screen button. Materials go directly into your inventory, with an independent **10%** roll for each listed drop on every kill:

| Boss | Material → crafted equipment |
| --- | --- |
| Mahoraga | Broken Wheel → Adaptation Wheel; Handle → Handblade |
| Ethernaty | Rainbow Triangle + Energy Sphere → Plasma Crystal |
| Fire Destroyer | Inactive Eternal Flame → Eternal Flame |
| Solar Devourer | Broken Shield Piece → Solar Shield |
| Two-Faced Demon | Lightning Fragment → Kumatoke |

Crafted accessories use the existing five artifact slots; press **I** to equip them when your slots are full. Select crafted weapons by clicking their weapon-bar buttons. Hold attack to channel Plasma Crystal (600 base DPS, 20 mana/second) or Kumatoke (100 DPS). Handblade swings for 300 base damage over a wide 260-range arc without projectiles. Eternal Flame burns for 50 DPS over five seconds; further hits refresh it. Adaptation Wheel reduces subsequent incoming damage by 2 percentage points per hit, capped at 100%, and resets on boss death. Solar Shield adds a longer protected dash.

Materials, crafted items, and boss unlocks last for the current run, and reset when restarting or reloading. Check these mechanics with `node --test tests/workshop.test.cjs`.

Браузерна Canvas-гра: чотири класи, п’ять послідовних босів, одинадцять видів зброї та артефакти.

## Запуск

Відкрийте `index.html` у сучасному браузері. Або запустіть з папки проєкту:

```sh
python3 -m http.server 8000
```

Перейдіть на http://localhost:8000. Виберіть складність, потім клас.

## Файли

- `index.html` — екрани й елементи інтерфейсу.
- `css/styles.css` — оформлення та адаптивні меню.
- `js/game.js` — симуляція, боси, зброя, керування й рекорди.
- `js/boss-art.js` — деталізовані процедурні Canvas-моделі та анімації п’яти босів.
- `assets/fantasy-atlas.png` — 12 згенерованих ілюстрацій.

## Керування

WASD або стрілки — рух; ліва кнопка миші — стріляти в напрямку курсора; пробіл — ривок. 1–9, 0, Q або клік по панелі — зброя. I — артефакти; H — лікування; Esc — пауза; B — довідник босів. Клавіші руху працюють також з українською розкладкою. Гра призупиняється при втраті фокуса. Основна гра потребує клавіатури та миші; сенсорного керування немає.

## Складність

| Режим | HP босів | Вхідна шкода | Лікування | Перезарядка |
|---|---|---|---|---|
| Легка | ×0,7 | ×0,6 | 40% максимального HP | 16 с |
| Звичайна | ×1 | ×1 | 30% | 22 с |
| Важка | ×1,4 | ×1,45 | 20% | 30 с |

Час рахується лише під час гри; пауза, довідник та артефакти його зупиняють. Найшвидша повна перемога зберігається окремо для кожної складності в localStorage цього браузера. Якщо сховище недоступне, гра працює без збереження рекордів.

Симуляція має фіксований крок 60 Гц. Перезапуск повертає на вибір класу й очищає бойовий стан. Поточний забіг не зберігається після закриття сторінки.

## Комфортні ефекти

У бою використовуються мальовані моделі й анімації: колесо та кінцівки Mahoraga, кільця Ethernaty, крила й паща дракона, сегменти сонячного черв’яка, чотири руки демона. Згенеровані портрети залишені в меню й довіднику.

Праворуч угорі є перемикач «Ефекти»: «Спокійні» або «Мінімальні». В обох режимах немає тряски камери, повноекранних спалахів і миготіння гравця. Режим «Мінімальні» прибирає світіння та фонові іскри й додатково зменшує частинки. Попередження, снаряди й небезпечні зони залишаються видимими. Вибір зберігається в браузері; системне зменшення руху вмикає мінімальний режим при першому запуску.

## Нові моделі босів

Босів намальовано геометрією Canvas без генерації чи завантаження нових зображень. Mahoraga має гравійоване колесо, наплічники, поножі, рухому тканину й меч; Ethernaty — просторові кільця, орбітальні уламки й грановане ядро; дракон — перетинки крил, луску, зчленований хвіст і шарнірну щелепу; Solar Devourer — броньовані сегменти, вентиляційні пластини й рухомі щелепи; демон — чотири незалежні руки, маски облич, броню та тканину.

Пози плавно переходять між очікуванням, підготовкою атаки, ударом і відновленням; попадання викликає невеликий рух моделі. Рухи прив’язані до часу симуляції й завмирають на паузі.

Перевірка анімацій без залежностей: `node --test tests/boss-art.test.cjs`. Тести перевіряють зміну поз, реакцію на шкоду, незмінність кадру при зупиненому часі й рендеринг малих черв’яків.
