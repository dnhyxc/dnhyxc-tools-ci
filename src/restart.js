const { NodeSSH } = require("node-ssh");
const chalk = require('chalk');
const { beautyLog, getPublishConfig, onConnectServer, onRestartNginx, onCollectServerInfo, onRestartServer } = require('./utils')

const ssh = new NodeSSH();

const onRestart = async ({
  host,
  port,
  username,
  password,
  projectName,
  publishConfig
}) => {
  try {
    await onConnectServer({ host, port, username, password, ssh });
    if (projectName === 'nginx') {
      await onRestartNginx(publishConfig, ssh);
    }
    if (projectName === 'node') {
      await onRestartServer(publishConfig.serviceInfo.restartPath, ssh);
    }
  } catch (error) {
    console.log(beautyLog.error, chalk.red(`拉取配置文件失败: ${error}`));
  } finally {
    ssh.dispose();
  }
}

const restart = async (projectName, option) => {
  const {
    host: _host,
    port: _port,
    username: _username,
    password: _password,
  } = option;

  const publishConfig = getPublishConfig();

  if (!publishConfig?.nginxInfo || !publishConfig?.nginxInfo?.restartPath || !publishConfig?.nginxInfo?.remoteFilePath) {
    console.log(beautyLog.warning, chalk.yellowBright(`请先在 ${chalk.cyan('publish.config.js')} 文件中配置 nginxInfo 相关信息`));
    process.exit(0);
  }

  if (!publishConfig?.serviceInfo || !publishConfig?.serviceInfo?.restartPath) {
    console.log(beautyLog.warning, chalk.yellowBright(`请先在 ${chalk.cyan('publish.config.js')} 文件中配置 serviceInfo 相关信息`));
    process.exit(0);
  }

  const result = await onCollectServerInfo({
    host: _host,
    port: _port,
    username: _username,
    password: _password,
    publishConfig
  })

  const { host, port, username, password } = result;

  await onRestart({
    host: host || _host || publishConfig?.serverInfo?.host,
    port: port || _port || publishConfig?.serverInfo?.port,
    username: username || _username || publishConfig?.serverInfo?.username,
    password: password || _password,
    projectName,
    publishConfig
  })
};

module.exports = {
  restart
}
