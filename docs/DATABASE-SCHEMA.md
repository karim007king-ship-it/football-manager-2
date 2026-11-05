# Football Manager 2 — مواصفات قاعدة البيانات

## الغرض
هذا الملف يحدد نموذج البيانات قبل توسيع المحتوى. مصدر البيانات سيكون منفصلاً عن المحرك والواجهة، مع معرّفات ثابتة وروابط مرجعية واضحة. يجب ألا تعتمد الواجهة على أسماء أو أرقام ثابتة داخل الشيفرة.

## الأهداف المرحلية للمحتوى
- الإصدار الأول الموسع: 24 نادياً تونسياً موزعة على درجتين داخل عالم اللعبة.
- 24 لاعباً لكل نادٍ: 576 لاعباً.
- 120 لاعباً حراً وناشئاً: 696 لاعباً إجمالاً.
- تصميم قابل للتوسع إلى 64 نادياً أو أكثر، ثم إضافة أسواق عربية وإفريقية وأوروبية.
- يمكن أن تكون قوائم اللاعبين خيالية في البداية. أي بيانات واقعية عن لاعب/نادٍ يجب التحقق منها قبل وصفها بأنها رسمية.

## الكيانات الأساسية

### Club
- `id`: معرف ثابت مثل `club.tun.espérance`.
- `name`, `shortName`, `countryCode`, `city`.
- `divisionId`, `reputation`, `budget`, `wageBudget`.
- `stadiumId`, `trainingLevel`, `academyLevel`.
- `objective`, `colors`, `foundedYear` (اختياري إذا كانت القيمة موثقة).
- `active`, `databaseVersion`.

### Player
- `id`: معرف ثابت لا يعتمد على ترتيب اللاعب في المصفوفة.
- `firstName`, `lastName`, `displayName`, `nationality`, `birthDate` أو `age`.
- `clubId` (قابل لأن يكون null للاعب الحر)، `contractId`.
- `primaryPosition`, `secondaryPositions[]`, `preferredFoot`.
- `heightCm`, `weightKg` (اختياريان).
- `overall`, `potential`, `reputation`, `morale`, `form`, `fitness`.
- `attributes`: pace, acceleration, stamina, strength, agility, finishing, shotPower, passing, vision, crossing, dribbling, firstTouch, tackling, marking, positioning, heading, goalkeeping, decisions, teamwork, workRate.
- `wage`, `marketValue`, `contractYears`, `releaseClause` (اختياري).
- `apps`, `goals`, `assists`, `yellowCards`, `redCards`, `injury`, `suspension`.
- `development`: trainingFocus, growthRate, professionalism, consistency, injuryProneness.
- `isYouth`, `isFreeAgent`, `databaseVersion`.

### Competition
- `id`, `name`, `countryCode`, `level`, `format`, `seasonId`.
- `divisionIds[]`, `rules`, `prizeMoney`, `registrationRules`.

### Division
- `id`, `competitionId`, `name`, `level`, `clubIds[]`.
- `promotionPlaces`, `relegationPlaces`, `pointsForWin`, `pointsForDraw`.

### Fixture / Match
- `id`, `competitionId`, `seasonId`, `round`, `date`.
- `homeClubId`, `awayClubId`, `status`, `score`.
- `events[]`, `statistics`, `lineups`, `substitutions[]`, `playerRatings[]`.

### Contract
- `id`, `playerId`, `clubId`, `startDate`, `endDate`.
- `weeklyWage`, `bonuses`, `releaseClause`, `squadRole`, `status`.

### Staff
- `id`, `name`, `role`, `clubId`, `attributes`, `wage`, `contractYears`.

### Stadium
- `id`, `name`, `clubId`, `capacity`, `condition`, `facilities`, `ticketPrice`.

### Manager
- `id`, `name`, `nationality`, `reputation`, `attributes`, `careerHistory[]`.

## قواعد جودة البيانات
1. كل معرف فريد وثابت، ولا يُعاد توليده عند فتح اللعبة.
2. كل `clubId` و`stadiumId` و`competitionId` يشير إلى سجل موجود أو قيمة null مسموحة صراحة.
3. المراكز من قاموس ثابت: GK, CB, LB, RB, DM, CM, AM, LW, RW, ST.
4. الصفات والأرقام ضمن نطاقات موحدة موثقة، ولا يسمح بقيم سالبة أو تجاوز الحدود.
5. العمر متسق مع تاريخ الميلاد إن تم تخزينهما معاً.
6. اللاعب الحر لا يكون في التشكيلة الأساسية لأي نادٍ.
7. اللاعب المصاب أو الموقوف لا يكون مؤهلاً للتشكيلة في المباراة.
8. لا يتكرر اللاعب نفسه داخل تشكيلة المباراة.
9. لا تُخزن المعلومة نفسها في أكثر من موضع دون سبب؛ العقد كيان مستقل عند اكتمال نظام العقود.
10. التوليد العشوائي يجب أن يكون حتمياً باستخدام seed، مع فحوص تمنع تكرار الأسماء المولدة داخل النادي.

## التوافق مع الحفظ الحالي
- مفتاح الحفظ الحالي `fm2-career-v2` لا يتغير في المرحلة الأولى.
- لا تستبدل قوائم اللاعبين أو نتائج المستخدم في مسيرة موجودة بقاعدة البيانات الجديدة.
- تتم إضافة الحقول الجديدة بقيم افتراضية محافظة.
- يتم حفظ `databaseVersion` و`saveSchemaVersion` لتسهيل الترحيل المستقبلي.
- يجب أن تكون عملية الترحيل قابلة لإعادة التشغيل بأمان (idempotent).
- لا يتم مسح أو إعادة إنشاء الحفظ عند فشل الترحيل؛ اعرض خطأ واضحاً وحافظ على نسخة البيانات الأصلية.

## خطة التنفيذ التقنية
1. إنشاء ملف بيانات مستقل للأندية والبطولات والبلدان.
2. إنشاء مولد لاعبين حتمي مع قاموس أسماء ومراكز وصفات.
3. بناء طبقة تحقق قبل تحميل البيانات في المحرك.
4. توفير فهرسة حسب المعرف والنادي والمركز والعمر.
5. تحويل المحرك تدريجياً إلى استهلاك هذه الطبقة بدلاً من التوليد الداخلي.
6. اختبار حفظ قديم يحتوي 144 لاعباً وترحيله دون فقدان بياناته.
7. اختبار قاعدة 696 لاعباً، ثم قياس وقت التحميل والحفظ والبحث على الهاتف.
