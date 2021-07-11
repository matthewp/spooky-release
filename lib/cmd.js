import { parse } from 'https://deno.land/std@0.100.0/flags/mod.ts';

let args = parse(Deno.args);

let { pkg, version, files } = args;

if(!pkg || !version || !files) {
  console.error('Must provide --pkg and --version and --files');
  Deno.exit(1);
}

const SEMVER_REGEX = /([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?/;

function replace(source) {
  let versionExp = new RegExp(`(cdn.spooky.click/${pkg}/)(${SEMVER_REGEX.source})`, 'g');
  let changed = false;

  source = source.replace(versionExp, (full, first, vers) => {
    if(vers !== version) changed = true;
    return first + version;
  });

  return { changed, source };
}

async function updateFile(file) {
  let data = await Deno.readTextFile(file);
  let { changed, source } = replace(data);
  if(changed) {
    await Deno.writeTextFile(file, source);
  }
  return { changed };
}

async function start() {
  await updateFile(files);
}

start();