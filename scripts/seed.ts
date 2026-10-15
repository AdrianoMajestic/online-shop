/**
 * Seed script for «Кабачок» shop.
 * Full data seeding will be implemented in task T01.
 */
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🌱 [Seed] Каркас скрипта seed инициализирован для задачи T00.");
  console.log("🌱 [Seed] Наполнение базы данных (категории, бренды, товары) будет выполнено в задаче T01.");
}

main().catch((err) => {
  console.error("Ошибка при выполнении seed:", err);
  process.exit(1);
});
