const fs = require('fs-extra');
const { NodeSSH } = require("node-ssh");
const chalk = require('chalk');
const ora = require('ora');
const { beautyLog, getPublishConfig, onConnectServer, onCollectServerInfo } = require('./utils')

const ssh = new NodeSSH();

// 读取 ngnix 配置
const onReadNginxConfig = async (remotePath, localFileName) => {
  const spinner = ora({
    text: chalk.yellowBright(`正在读取远程文件: ${chalk.cyan(`${remotePath}`)}`),
  }).start();
  try {
    const result = await ssh.execCommand(`cat ${remotePath}`);
    const nginxConfigContent = result.stdout;
    if (nginxConfigContent) {
      // 写入到本地文件
      await fs.writeFile(localFileName, nginxConfigContent);
      spinner.succeed(chalk.greenBright(`读取 nginx.conf 成功，内容已写入到本地 ${chalk.cyan(`${localFileName}`)} 文件中`));
    } else {
      spinner.fail(chalk.redBright(`读取 nginx.conf 失败，远程文件 ${chalk.cyan(`${remotePath}`)} 内容为空`));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.redBright(`读取: ${chalk.cyan(`${remotePath}`)} 文件失败，${err}`));
    process.exit(1);
  }
}

const onPullConfig = async ({
  host,
  port,
  username,
  password,
  nginxRemoteFilePath,
}) => {
  try {
    await onConnectServer({ host, port, username, password, ssh });
    await onReadNginxConfig(nginxRemoteFilePath, `${process.cwd()}/nginx.conf`)
  } catch (error) {
    console.log(beautyLog.error, chalk.red(`拉取配置文件失败: ${error}`));
  } finally {
    ssh.dispose();
  }
}

const pull = async (projectName, option) => {
  const {
    host: _host,
    port: _port,
    username: _username,
    password: _password,
    nginxRemoteFilePath: _nginxRemoteFilePath,
  } = option;

  const publishConfig = getPublishConfig();

  // 获取收集的服务器信息
  const result = await onCollectServerInfo({
    host: _host,
    port: _port,
    username: _username,
    password: _password,
    publishConfig,
    nginxRemoteFilePath: _nginxRemoteFilePath,
    command: 'pull'
  })

  const { host, port, username, password, nginxRemoteFilePath } = result;

  await onPullConfig({
    host: host || _host || publishConfig?.serverInfo?.host,
    port: port || _port || publishConfig?.serverInfo?.port,
    username: username || _username || publishConfig?.serverInfo?.username,
    password: password || _password,
    nginxRemoteFilePath: nginxRemoteFilePath || _nginxRemoteFilePath || publishConfig?.nginxInfo?.remoteFilePath,
  })
};

module.exports = {
  pull
}
