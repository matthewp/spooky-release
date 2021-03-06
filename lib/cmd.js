import { parse } from 'https://deno.land/std@0.106.0/flags/mod.ts';

let args = parse(Deno.args);

let { pkg, version, files, domain, _ } = args;
if(_.length) {
  files = (Array.isArray(files) ? files : [files]).concat(_);
}

if(!pkg || !version || !files) {
  console.error('Must provide --pkg and --version and --files');
  Deno.exit(1);
}

const d = domain || 'cdn.spooky.click';
const SEMVER_REGEX = /([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?/;

function replace(source) {
  let versionExp = new RegExp(`(${d}/${pkg}/)(${SEMVER_REGEX.source})`, 'g');
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

async function updateFiles(filesRaw) {
  let files = Array.isArray(filesRaw) ? filesRaw : [filesRaw];
  let results = [];
  for(let file of files) {
    results.push(updateFile(file).then(({ changed }) => changed));
  }
  let changes = await Promise.all(results);
  return {
    changed: changes.some(val => val)
  };
}

async function gitAdd() {
  let p = Deno.run({
    cmd: ['git', 'add', '-A']
  });
  let { code } = await p.status();
  return code;
}

async function gitCommit() {
  let p = Deno.run({
    cmd: ['git', 'commit', '-m', `Updated docs for ${version}`]
  });
  let { code } = await p.status();
  return code;
}

async function gitTag() {
  let p = Deno.run({
    cmd: ['git', 'tag', '-a', `v${version}`, '-m', version.toString()]
  })
  let { code } = await p.status();
  return code;
}

async function runGit() {
  let code = 0;
  for(let cmd of [gitAdd, gitCommit, gitTag]) {
    code = await cmd();
    if(code) {
      break;
    }
  }
  return code;
}

async function start() {
  let { changed } = await updateFiles(files);
  let code = 0;
  if(changed) {
    code = await runGit();
  }
  Deno.exit(code);
}

start();