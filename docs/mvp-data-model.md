# KAP MVP adatmodell - első kör

Ez a fájl a `supabase/migrations/0001_initial_company_client_survey.sql` tartalmát magyarázza.

## Mi van benne most

Az első kör négy alap táblára épül:

- `companies`
- `profiles`
- `clients`
- `site_surveys`

Ez elég ahhoz, hogy a rendszer elinduljon:

- két cég tesztüzemben
- userhez kötött belépés
- céghez kötött adatszétválasztás
- ügyfelek kezelése
- mentett felmérések tárolása

## Tábla szerepek

### `companies`
A cégek alapadatai.

Példák:
- cégnév
- slug
- kapcsolat
- arculati színek

### `profiles`
A belépett user és a cég kapcsolata.

Fontos:
- `id` = `auth.users.id`
- egy user egy céghez tartozik az MVP-ben
- szerepkör most: `owner`, `admin`, `surveyor`, `staff`

### `clients`
Az ügyfélkarton alapja.

Példák:
- név
- email
- telefon
- számlázási cím
- projektcím
- megjegyzés

### `site_surveys`
A publikus vagy belső felmérés mentett rekordja.

Példák:
- állapot
- forrás
- helyszín
- projektcél
- kiválasztott szolgáltatások
- teljes form payload
- térképes payload
- előzetes kalkuláció

## Miért nincs még minden most benne

Szándékosan nincs még bent:

- `quotes`
- `quote_items`
- `price_items`
- `revenues`
- `expenses`
- `calendar_events`

Ezek a következő körben jönnek.

Az első cél most az, hogy:
- legyen stabil auth
- legyen cégszintű adatszétválasztás
- lehessen menteni felmérést
- lehessen ügyfélhez kötni felmérést

## RLS logika

Minden üzleti adat RLS alatt van.

Jelenlegi alapelv:
- a user a `profiles` táblából kapja a `company_id`-ját
- a `clients` és `site_surveys` csak ugyanazon céghez enged hozzáférést

## Fontos megjegyzés az onboardingról

A `profiles` tábla most tudatosan nem enged szabad public insertet.

Ennek oka:
- nem akarjuk, hogy bárki tetszőleges `company_id`-val írjon be profilt
- a kezdeti cég + profil létrehozást később külön onboarding flow vagy szerveroldali művelet fogja intézni

Ez azt jelenti, hogy a login réteg készülhet, de a teljes céges onboarding még külön kör lesz.

## Következő táblák

A következő adatmodell körben várhatóan ezek jönnek:

- `quotes`
- `quote_items`
- `price_items`
- `revenues`
- `expenses`

Utána már valódi ajánlati és pénzügyi adminná tud továbbépülni a rendszer.
