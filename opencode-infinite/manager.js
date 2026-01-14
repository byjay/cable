import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';

// --- 범용 설정 ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_HOME = process.env.HOME || process.env.USERPROFILE;

// 동적 프로젝트 경로 (환경변수 또는 현재 작업 디렉토리)
const TARGET_PROJECT_PATH = process.env.TARGET_PROJECT || process.env.CWD || process.cwd();

// 인증 파일 예상 경로 (대상 프로젝트 기준)
const POSSIBLE_AUTH_PATHS = [
    path.join(TARGET_PROJECT_PATH, '.opencode', 'auth_antigravity.json'),
    path.join(TARGET_PROJECT_PATH, '.opencode', 'storage.json'),
    path.join(TARGET_PROJECT_PATH, '.opencode', 'auth.json'),
    path.join(TARGET_PROJECT_PATH, '.opencode', 'session.json'),
    path.join(TARGET_PROJECT_PATH, '.antigravity', 'User', 'globalStorage', 'storage.json'),
    path.join(TARGET_PROJECT_PATH, '.antigravity', 'User', 'globalStorage', 'state.vscdb'),
    // 기존 경로들 (하위 호환성)
    path.join(process.env.APPDATA || '', 'Antigravity', 'User', 'globalStorage', 'storage.json'),
    path.join(process.env.APPDATA || '', 'Antigravity', 'User', 'globalStorage', 'state.vscdb'),
    path.join(USER_HOME || '', '.opencode', 'auth_antigravity.json'),
    path.join(USER_HOME || '', '.opencode', 'storage.json'),
    path.join(USER_HOME || '', '.opencode', 'auth.json'),
    path.join(USER_HOME || '', '.opencode', 'session.json')
];

let OPENCODE_AUTH_PATH = null;

// 토큰 저장소 (대상 프로젝트 기준)
const TOKEN_VAULT_DIR = path.join(TARGET_PROJECT_PATH, '.opencode', 'tokens');

// 유효한 인증 파일 찾기 (대상 프로젝트에서 우선 검색)
async function findAuthFile() {
    // 대상 프로젝트 경로에서 먼저 검색
    for (const p of POSSIBLE_AUTH_PATHS.slice(0, 4)) {  // 처음 4개는 TARGET_PROJECT 기준
        if (await fs.pathExists(p)) {
            return p;
        }
    }
    
    // 없으면 기존 경로들에서 검색 (하위 호환성)
    for (const p of POSSIBLE_AUTH_PATHS.slice(4)) {
        if (await fs.pathExists(p)) {
            return p;
        }
    }
    return null;
}

// 1. 현재 세션 저장
async function saveCurrentSession(accountName) {
    try {
        if (!OPENCODE_AUTH_PATH) {
            OPENCODE_AUTH_PATH = await findAuthFile();
        }

        if (OPENCODE_AUTH_PATH) {
            const dest = path.join(TOKEN_VAULT_DIR, `${accountName}.json`);
            await fs.copy(OPENCODE_AUTH_PATH, dest);
            console.log(`✅ [저장 완료] 현재 세션이 '${accountName}'(으)로 저장되었습니다.`);
            console.log(`   대상 프로젝트: ${TARGET_PROJECT_PATH}`);
            console.log(`   원본 경로: ${OPENCODE_AUTH_PATH}`);
            console.log(`   저장 경로: ${dest}`);
        } else {
            console.error(`❌ [오류] 인증 파일을 찾을 수 없습니다!`);
            console.log(`   검색한 경로:`);
            POSSIBLE_AUTH_PATHS.forEach(p => console.log(`     - ${p}`));
            console.log("👉 먼저 오픈코드를 실행하고 로그인을 해주세요.");
        }
    } catch (err) {
        console.error('저장 중 오류 발생:', err);
    }
}

// 2. 세션 불러오기
async function loadSession(accountName) {
    try {
        if (!OPENCODE_AUTH_PATH) {
            OPENCODE_AUTH_PATH = await findAuthFile() || POSSIBLE_AUTH_PATHS[0];
        }

        const src = path.join(TOKEN_VAULT_DIR, `${accountName}.json`);
        if (await fs.pathExists(src)) {
            const targetDir = path.dirname(OPENCODE_AUTH_PATH);
            await fs.ensureDir(targetDir);

            await fs.copy(src, OPENCODE_AUTH_PATH);
            console.log(`🔄 [로드 완료] '${accountName}' 계정으로 전환되었습니다.`);
            console.log(`   대상 프로젝트: ${TARGET_PROJECT_PATH}`);
            console.log(`   타겟 파일: ${OPENCODE_AUTH_PATH}`);
            console.log(`🚀 이제 오픈코드(Antigravity)를 다시 실행하세요.`);
        } else {
            console.error(`❌ [오류] 저장된 토큰이 없습니다: ${accountName}`);
            const accounts = await listAccounts();
            console.log("   사용 가능한 계정:", accounts.join(', '));
        }
    } catch (err) {
        console.error('로드 중 오류 발생:', err);
    }
}

// 3. 계정 목록
async function listAccounts() {
    if (!await fs.pathExists(TOKEN_VAULT_DIR)) return [];
    const files = await fs.readdir(TOKEN_VAULT_DIR);
    return files.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));
}

// --- 메인 함수 ---
async function main() {
    console.log("\n============================================");
    console.log("   🧠  CLAUDE 4.5 THINKING UNLIMITED  🧠   ");
    console.log("   >> DesignSir System Activated            ");
    console.log("============================================\n");

    const args = process.argv.slice(2);
    const command = args[0];
    const param = args[1];

    // 프리셋 계정 목록
    // Load presets from external file
    let PRESETS = [];
    try {
        const presetPath = path.join(__dirname, 'presets.json');
        if (await fs.pathExists(presetPath)) {
            PRESETS = await fs.readJson(presetPath);
        } else {
            console.log("⚠️  presets.json not found, using empty list.");
        }
    } catch (err) {
        console.error("Error loading presets:", err);
    }

    if (command === 'save') {
        if (!param) {
            console.log("사용법: node manager.js save <별칭>");
        } else {
            await saveCurrentSession(param);
        }
    } else if (command === 'load') {
        const accounts = await listAccounts();
        if (!param) {
            if (accounts.length === 0) {
                console.log("❌ 저장된 세션이 없습니다. '설정 마법사'를 먼저 실행해주세요.");
            } else {
                const { name } = await inquirer.prompt([{
                    type: 'list',
                    name: 'name',
                    message: '전환할 계정을 선택하세요:',
                    choices: accounts
                }]);
                await loadSession(name);
            }
        } else {
            await loadSession(param);
        }
    } else if (command === 'list') {
        const accounts = await listAccounts();
        console.log("저장된 계정 목록:");
        accounts.forEach(acc => console.log(` - ${acc}`));

    } else if (command === 'rotate') {
        // --- 순환(Rotate) 로직 ---
        const accounts = await listAccounts();
        if (accounts.length === 0) {
            console.log("❌ 저장된 계정이 없습니다.");
            return;
        }

        // 현재 어떤 계정이 로드되어 있는지 확인이 어려우므로 (파일 내용 비교는 복잡)
        // 별도의 상태 파일(current_session.txt)을 만들어 추적하거나, 
        // 단순히 "다음 계정"을 묻는 방식으로 구현.
        // 여기서는 가장 직관적으로: "목록 순서대로 다음 거 무조건 로드" (랜덤 아님)

        // 상태 파일 경로
        const stateFile = path.join(TOKEN_VAULT_DIR, 'last_rotated.txt');
        let lastIdx = -1;

        if (await fs.pathExists(stateFile)) {
            const lastAccount = (await fs.readFile(stateFile, 'utf-8')).trim();
            lastIdx = accounts.indexOf(lastAccount);
        }

        // 다음 인덱스 계산
        let nextIdx = lastIdx + 1;
        if (nextIdx >= accounts.length) {
            nextIdx = 0; // 끝에 다다르면 처음으로
        }

        const nextAccount = accounts[nextIdx];
        console.log(`🔄 순환 모드: ${nextAccount} 계정으로 교체합니다...`);

        await loadSession(nextAccount);

        // 상태 저장
        await fs.writeFile(stateFile, nextAccount, 'utf-8');

    } else if (command === 'setup-preset') {
        // --- 프리셋 전용 설정 마법사 ---
        console.log("🧙‍♂️ [프리셋 모드] 10개 프리셋 계정 설정을 시작합니다.");

        for (const email of PRESETS) {
            console.log(`\n--------------------------------------------`);
            console.log(`Target: [ ${email} ]`);
            console.log(`--------------------------------------------`);

            // 파일이 이미 있으면 물어보기
            const dest = path.join(TOKEN_VAULT_DIR, `${email}.json`);
            if (await fs.pathExists(dest)) {
                console.log(`ℹ️  ${email} 토큰이 이미 있습니다. 건너뛸까요?`);
                const { skip } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'skip',
                    message: '이미 존재하는 토큰입니다. 건너뛰시겠습니까? (다시 로그인하려면 n)',
                    default: true
                }]);
                if (skip) continue;
            }

            console.log(`\n🚨 [중요: 로그인 창은 직접 띄워야 합니다!] 🚨`);
            console.log(`프로그램이 자동으로 구글 로그인 창을 띄울 수 없습니다.`);
            console.log(`\n👉 직접 하실 일:`);
            console.log(`1. 바탕화면의 [OpenCode] 또는 [VS Code] 실행`);
            console.log(`2. 프로그램 안에서 [Antigravity] 아이콘 클릭 -> 로그인`);
            console.log(`3. [ ${email} ] 계정으로 로그인 성공 확인`);
            console.log(`4. 그 다음, 여기서 엔터!`);

            await inquirer.prompt([{ type: 'input', name: 'dummy', message: '로그인을 완료했다면 엔터를 누르세요...' }]);
            await saveCurrentSession(email);
        }
        console.log("\n✅ 모든 프리셋 계정 설정이 완료되었습니다!");

    } else if (command === 'setup') {
        console.log("🧙‍♂️ 설정 마법사를 시작합니다...");

        // 프리셋 사용 여부 묻기
        const { usePreset } = await inquirer.prompt([{
            type: 'confirm',
            name: 'usePreset',
            message: '프리셋(10개) 계정을 자동으로 설정하시겠습니까?',
            default: true
        }]);

        if (usePreset) {
            // 프리셋 커맨드로 재귀 호출
            process.argv[2] = 'setup-preset';
            await main();
            return;
        }

        console.log("이 마법사는 구글 계정들을 하나씩 등록하도록 도와줍니다.\n");
        const { count } = await inquirer.prompt([{
            type: 'number',
            name: 'count',
            message: '설정할 구글 계정이 총 몇 개인가요?',
            default: 2
        }]);

        for (let i = 1; i <= count; i++) {
            console.log(`\n--- 계정 ${i} / ${count} ---`);
            const { googleId } = await inquirer.prompt([{
                type: 'input',
                name: 'googleId',
                message: `계정 이메일 입력:`,
                validate: input => input ? true : '입력 필수'
            }]);

            console.log(`1. 오픈코드 실행 -> 2. ${googleId} 직접 로그인 -> 3.완료 후 엔터`);
            await inquirer.prompt([{ type: 'input', name: 'c', message: '로그인을 완료했다면 엔터를 누르세요...' }]);
            await saveCurrentSession(googleId);
        }
        console.log("\n✅ 설정 완료!");

    } else {
        // 대화형 모드
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '메뉴 선택:',
                choices: [
                    { name: '🔄 순환 (다음 계정으로 교체)', value: 'rotate' },
                    { name: '📂 저장된 계정 목록 보기', value: 'list' },
                    { name: '🪄  초기 설정 (마법사)', value: 'setup' },
                    { name: '❌ 종료', value: 'exit' }
                ]
            }
        ]);

        if (action === 'rotate') {
            process.argv[2] = 'rotate';
            await main();
        } else if (action === 'list') {
            // ... (기존 로직 재사용 또는 호출)
            const accounts = await listAccounts();
            console.log("=== 목록 ===");
            accounts.forEach(a => console.log(a));
        } else if (action === 'setup') {
            process.argv[2] = 'setup';
            await main();
        }
    }
}

main();
