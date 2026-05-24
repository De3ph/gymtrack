import { readFileSync } from 'fs';
  import { join } from 'path';
  import { translationSchema } from '../src/translations/translationsSchema';

  const translationFiles = ['en.json', 'tr.json'];
  const messagesDir = join(process.cwd(), 'frontend', 'messages');

  translationFiles.forEach(file => {
    const filePath = join(messagesDir, file);

  translationFiles.forEach(file => {
    const filePath = join(messagesDir, file);
    const content = JSON.parse(readFileSync(filePath, 'utf8'));
    const result = translationSchema.safeParse(content);

    if (!result.success) {
      console.error(`❌ Translation validation failed for ${file}:`);
      result.error.errors.forEach(err => {
        console.error(`   - ${err.message}`);
      });
      process.exit(1);
    }

    console.log(`✅ ${file} is valid`);
  });
