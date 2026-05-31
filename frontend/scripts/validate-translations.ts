import { readFileSync } from 'fs';
import { join } from 'path';
import { translationSchema } from '../src/i18n/translations-schema';

const translationFiles = ['en.json', 'tr.json'];
const messagesDir = join(process.cwd(), 'messages');

translationFiles.forEach(file => {
  const filePath = join(messagesDir, file);
  const content = JSON.parse(readFileSync(filePath, 'utf8'));
  const result = translationSchema.safeParse(content);

  if (!result.success) {
    console.error(`❌ Translation validation failed for ${file}:`);
    result.error.issues.forEach((err: { message: string; path: (string | number)[] }) => {
      console.error(`   - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  console.log(`✅ ${file} is valid`);
});
