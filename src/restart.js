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
  nginxRemoteFilePath,
  nginxRestartPath,
  serviceRestartPath
}) => {
  try {
    await onConnectServer({ host, port, username, password, ssh });
    if (projectName === 'nginx') {
      await onRestartNginx(nginxRemoteFilePath, nginxRestartPath, ssh);
    } else if (projectName === 'node') {
      await onRestartServer(serviceRestartPath, ssh);
    } else {
      console.log(beautyLog.error, chalk.red(`暂不支持 ${projectName} 服务的重启`));
      process.exit(1);
    }
  } catch (error) {
    console.log(beautyLog.error, chalk.red(`服务重启失败: ${error}`));
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
    nginxRemoteFilePath: _nginxRemoteFilePath,
    nginxRestartPath: _nginxRestartPath,
    serviceRestartPath: _serviceRestartPath,
  } = option;

  const publishConfig = getPublishConfig();

  // if (!publishConfig?.nginxInfo || !publishConfig?.nginxInfo?.restartPath || !publishConfig?.nginxInfo?.remoteFilePath) {
  //   console.log(beautyLog.warning, chalk.yellowBright(`请先在 ${chalk.cyan('publish.config.js')} 文件中配置 nginxInfo 相关信息`));
  //   process.exit(0);
  // }

  // if (!publishConfig?.serviceInfo || !publishConfig?.serviceInfo?.restartPath) {
  //   console.log(beautyLog.warning, chalk.yellowBright(`请先在 ${chalk.cyan('publish.config.js')} 文件中配置 serviceInfo 相关信息`));
  //   process.exit(0);
  // }

  const result = await onCollectServerInfo({
    host: _host,
    port: _port,
    username: _username,
    password: _password,
    projectName,
    publishConfig,
    nginxRemoteFilePath: _nginxRemoteFilePath,
    nginxRestartPath: _nginxRestartPath,
    serviceRestartPath: _serviceRestartPath,
    command: 'restart'
  })

  const { host, port, username, password, nginxRemoteFilePath, nginxRestartPath, serviceRestartPath } = result;

  await onRestart({
    host: host || _host || publishConfig?.serverInfo?.host,
    port: port || _port || publishConfig?.serverInfo?.port,
    username: username || _username || publishConfig?.serverInfo?.username,
    password: password || _password,
    projectName,
    nginxRemoteFilePath: nginxRemoteFilePath || _nginxRemoteFilePath || publishConfig?.nginxInfo?.remoteFilePath,
    nginxRestartPath: nginxRestartPath || _nginxRestartPath || publishConfig?.nginxInfo?.restartPath,
    serviceRestartPath: serviceRestartPath || _serviceRestartPath || publishConfig?.serviceInfo?.restartPath,
  })
};

module.exports = {
  restart
}
