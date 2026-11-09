import sharp from 'sharp';
await sharp('public/images/estate.jpg').resize(1440).webp({quality:70}).toFile('public/images/estate.webp');
await sharp('public/images/estate.jpg').resize(700).webp({quality:70}).toFile('public/images/estate-mobile.webp');
for(const name of ['room','suite','villa'])await sharp('public/images/'+name+'.jpg').webp({quality:78}).toFile('public/images/'+name+'.webp');
