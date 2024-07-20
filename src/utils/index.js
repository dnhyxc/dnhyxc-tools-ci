const path = require("path");
const fs = require("fs");
const chalk = require("chalk");
const prompts = require("prompts");
const ora = require('ora');

const isUnicodeSupported = () => {
  // 操作系统平台是否为 win32（Windows）
  if (process.platform !== "win32") {
    // 判断 process.env.TERM 是否为 'linux'，
    // 这表示在 Linux 控制台（内核）环境中。
    return process.env.TERM !== "linux"; // Linux console (kernel)
  }

  return (Boolean(process.env.CI) || // 是否在持续集成环境中
    Boolean(process.env.WT_SESSION) || // Windows 终端环境（Windows Terminal）中的会话标识
    Boolean(process.env.TERMINUS_SUBLIME) || // Terminus 插件标识
    process.env.ConEmuTask === "{cmd::Cmder}" || // ConEmu 和 cmder 终端中的任务标识
    process.env.TERM_PROGRAM === "Terminus-Sublime" || process.env.TERM_PROGRAM === "vscode" || // 终端程序的标识，可能是 'Terminus-Sublime' 或 'vscode'
    process.env.TERM === "xterm-256color" || process.env.TERM === "alacritty" || // 终端类型，可能是 'xterm-256color' 或 'alacritty'
    process.env.TERMINAL_EMULATOR === "JetBrains-JediTerm" // 终端仿真器的标识，可能是 'JetBrains-JediTerm'
  );
};

const main = {
  info: chalk.blue("ℹ"),
  success: chalk.green("✔"),
  warning: chalk.yellow("⚠"),
  error: chalk.red("✖"),
  star: chalk.cyan("✵"),
  arrow: chalk.yellow("➦")
};

const fallback = {
  info: chalk.blue("i"),
  success: chalk.green("√"),
  warning: chalk.yellow("‼"),
  error: chalk.red("×"),
  star: chalk.cyan("*"),
  arrow: chalk.yellow("->")
};

const beautyLog = isUnicodeSupported() ? main : fallback;


// 根据语义化版本规则增加版本号
const updateVersion = (version) => {
  const parts = version.split('.');
  let major = parseInt(parts[0]);
  let minor = parseInt(parts[1]);
  let patch = parseInt(parts[2]);

  if (patch >= 99) {
    minor += 1;
    patch = 0;
  } else if (minor >= 99) {
    major += 1;
    minor = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
};

// 判断是否是合格的文件路径
const isValidFilePath = (path) => {
  // 使用正则表达式检查路径格式
  const regex = /^\/(?:[^/]+\/)*[^/]+$/;
  return regex.test(path);
}

// 校验文件是否存在
const verifyFile = (path) => {
  return fs.existsSync(path);
};


const getPublishConfig = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(`${process.cwd()}/publish.config.js`);
    return config;
  } catch (error) {
    console.log(
      beautyLog.warning,
      chalk.yellowBright('当前项目根目录下未配置 publish.config.js 文件，需要手动输入配置信息')
    );
    return null;
  }
};

// 连接服务器
const onConnectServer = async ({ host, port, username, password, ssh }) => {
  try {
    // 连接到服务器
    await ssh.connect({
      host,
      username,
      port,
      password,
      tryKeyboard: true,
    });
  } catch (err) {
    console.log(beautyLog.error, chalk.red(`连接服务器失败: ${err}`));
    process.exit(1);
  }
}

// 获取配置信息
const getConfigServerInfo = (publishConfig, configType, field, message) => {
  if (publishConfig?.[configType]?.[field]) {
    return publishConfig?.[configType]?.[field];
  } else {
    message && console.log('\n' + beautyLog.warning, chalk.yellowBright(`未找到项目 ${chalk.cyan(configType)}.${chalk.cyan(field)} 的配置信息，请手动输入!\n`));
    return undefined;
  }
}

// 获取配置信息
const getConfigFilePath = (publishConfig, projectName, field) => {
  const value = publishConfig?.porjectInfo[projectName]?.[field];
  if (field === 'isServer' && value !== undefined) {
    return value;
  } else if (value) {
    return value;
  } else {
    console.log('\n' + beautyLog.warning, chalk.yellowBright(`未找到项目 ${chalk.cyan(field)} 的配置信息，请手动输入!\n`));
    return undefined;
  }
};

// 收集服务器信息
const onCollectServerInfo = async ({ host, port, username, password, projectName, publishConfig, command, nginxRemoteFilePath, nginxRestartPath, serviceRestartPath }) => {
  try {
    result = await prompts([{
      name: 'host',
      type: host || getConfigServerInfo(publishConfig, 'serverInfo', 'host', true) ? null : 'text',
      message: 'host:',
      initial: getConfigServerInfo(publishConfig, 'serverInfo', 'host') || '',
      validate: value => value ? true : '请输入host'
    }, {
      name: 'port',
      type: port || getConfigServerInfo(publishConfig, 'serverInfo', 'port', true) ? null : 'text',
      message: '端口号:',
      initial: getConfigServerInfo(publishConfig, 'serverInfo', 'port') || '',
      validate: value => value ? true : '请输入端口号'
    }, {
      name: 'username',
      type: username || getConfigServerInfo(publishConfig, 'serverInfo', 'username', true) ? null : 'text',
      message: '用户名称:',
      initial: getConfigServerInfo(publishConfig, 'serverInfo', 'username') || '',
      validate: value => value ? true : '请输入用户名称'
    }, {
      name: 'nginxRemoteFilePath',
      type: nginxRemoteFilePath || getConfigServerInfo(publishConfig, 'nginxInfo', 'remoteFilePath', projectName !== 'node') || projectName === 'node' ? null : 'text',
      message: '服务器 nginx.conf 文件路径:',
      initial: getConfigServerInfo(publishConfig, 'nginxInfo', 'remoteFilePath') || '',
      validate: value => isValidFilePath(value) ? true : '输入的服务器 nginx.conf 文件路径必须以 / 开头'
    }, {
      name: 'nginxRestartPath',
      type: (nginxRestartPath || getConfigServerInfo(publishConfig, 'nginxInfo', 'restartPath', command !== 'pull' || projectName === 'nginx') || (!nginxRestartPath && !getConfigServerInfo(publishConfig, 'nginxInfo', 'restartPath') && command === 'pull')) || projectName === 'node' ? null : 'text',
      message: '服务器 nginx 重启路径:',
      initial: getConfigServerInfo(publishConfig, 'nginxInfo', 'restartPath') || '',
      validate: value => isValidFilePath(value) ? true : '输入的服务器 nginx 重启路径必须以 / 开头'
    }, {
      name: 'serviceRestartPath',
      type: ((serviceRestartPath || getConfigServerInfo(publishConfig, 'serviceInfo', 'restartPath', command === 'restart' && projectName === 'node') || (!serviceRestartPath && !getConfigServerInfo(publishConfig, 'serviceInfo', 'restartPath') && (command !== 'restart')))) || projectName === 'nginx' ? null : 'text',
      message: '服务器 node 重启路径:',
      initial: getConfigServerInfo(publishConfig, 'serviceInfo', 'restartPath') || '',
      validate: value => isValidFilePath(value) ? true : '输入的服务器 node 重启路径必须以 / 开头'
    }, {
      name: 'password',
      type: password ? null : 'password',
      message: '密码:',
      initial: '',
      validate: value => value ? true : '请输入密码'
    }], {
      onCancel: () => {
        throw new Error('User cancelled');
      }
    });
    return result;
  } catch (err) {
    console.log(beautyLog.error, chalk.red(err));
    process.exit(1);
  }
}

// 删除本地文件
const onRemoveFile = async (localFile) => {
  const spinner = ora({
    text: chalk.yellowBright(`正在删除文件: ${chalk.cyan(localFile)}`),
  }).start();
  return new Promise((resolve, reject) => {
    try {
      const fullPath = path.resolve(localFile);
      // 删除文件
      fs.unlink(fullPath, (err) => {
        if (err === null) {
          spinner.succeed(chalk.greenBright(`删除文件: ${chalk.cyan(localFile)} 成功\n`));
          resolve(1);
        }
      });
    } catch (err) {
      console.error(chalk.red(`Failed to delete file ${localFile}: ${err}`));
      spinner.fail(chalk.redBright(`删除文件: ${chalk.cyan(localFile)} 失败`));
      reject(err);
      process.exit(1);
    }
  })
};

// 校验nginx文件是否有效
const onCheckNginxConfig = async (remoteFilePath, restartPath, ssh) => {
  const spinner = ora({
    text: chalk.yellowBright(`正在检查服务器 ${remoteFilePath} 文件是否有效`)
  }).start();
  try {
    const res = await ssh.execCommand(`cd ${restartPath} && ./nginx -t -c ${remoteFilePath}`);
    console.log(res);
    spinner.succeed(chalk.greenBright(`nginx 文件: ${chalk.cyan(remoteFilePath)} 配置无误`));
  } catch (error) {
    spinner.fail(chalk.redBright(`nginx 文件: ${chalk.cyan(remoteFilePath)} 校验失败`));
    process.exit(0);
  }
};

// 重启 nginx 服务
const onRestartNginx = async (remoteFilePath, restartPath, ssh) => {
  await onCheckNginxConfig(remoteFilePath, restartPath, ssh);
  const spinner = ora({
    text: chalk.yellowBright('正在推送 nginx.conf 文件到远程服务器并重启远程 nginx 服务'),
  }).start();
  try {
    await ssh.execCommand(`cd ${restartPath} && ./nginx -s reload`);
    spinner.succeed(chalk.greenBright(chalk.bold(` 🎉 🎉 🎉 nginx 服务重启成功: ${chalk.cyan(`${restartPath}`)}!!! 🎉 🎉 🎉 \n`)));
  } catch (error) {
    spinner.fail(chalk.redBright(`重启 nginx 服务失败: ${error}`));
    process.exit(0);
  }
}

// 重启后台项目
const onRestartServer = async (remotePath, ssh) => {
  const spinner = ora({
    text: chalk.yellowBright(chalk.cyan('正在重启服务...')),
  }).start();
  try {
    const { code: deleteCode, stderr: deleteStderr } = await ssh.execCommand('pm2 delete 0');
    const { code: startCode, stderr: startStderr } = await ssh.execCommand(`pm2 start ${remotePath}/src/main.js`);
    const { code: listCode, stdout } = await ssh.execCommand('pm2 list');
    if (deleteCode === 0 && startCode === 0 && listCode === 0) {
      spinner.succeed(chalk.greenBright(`服务启动成功: \n${stdout}\n`));
      spinner.succeed(chalk.greenBright(chalk.bold(` 🎉 🎉 🎉 nginx 服务重启成功: ${chalk.cyan(`${remotePath}`)}!!! 🎉 🎉 🎉 \n`)));
    } else {
      spinner.fail(chalk.redBright(`服务启动失败: ${deleteStderr || startStderr}`));
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(chalk.redBright(`服务启动失败: ${error}`));
    process.exit(1);
  }
}

module.exports = {
  beautyLog,
  updateVersion,
  verifyFile,
  isValidFilePath,
  getPublishConfig,
  getConfigFilePath,
  onConnectServer,
  onCollectServerInfo,
  onRemoveFile,
  onRestartNginx,
  onRestartServer,
  getConfigServerInfo,
};