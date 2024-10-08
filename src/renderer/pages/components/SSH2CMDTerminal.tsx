import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import { SSH2ConnectConfig } from "../../../main/SSH2Ipc";


/**
 * 进行窗口输入命令交互式的终端页面.
 */
export default (({
  connectConfig
}: {
  connectConfig: SSH2ConnectConfig
}) => {

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);

  useEffect(() => {
    let removeSSH2Stderr: any;
    if (terminalRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'monospace',
        fontSize: 14,
        theme: {
          background: '#000000', // 黑色背景
          foreground: '#FFFFFF', // 白色文本
          cursor: '#FFFFFF', // 白色光标
        },
      });
      // Optionally, fit the terminal to the container
      const fitAddon = new FitAddon();
      terminalInstance.current = term;
      terminalInstance.current.loadAddon(fitAddon);
      terminalInstance.current.open(terminalRef.current);
      // fitAddon.fit();

      // 注册 ssh2 数据监听
      removeSSH2Stderr = window.electron.ssh2.on((...args: any[]) => {
        const stderr = args[0][0];
        term.write(`\x1b[34m${stderr}\x1b[0m`);
      })

    }
    return () => {
      // Cleanup and dispose the terminal instance
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
      if (removeSSH2Stderr) {
        removeSSH2Stderr();
      }
    };
  }, []);

  useEffect(() => {
    if (terminalInstance.current) {
      /**
       * 处理在 xterm UI组件上的输入;
       */
      let commandBuffer = '';
      const term = terminalInstance.current;
      term.onData((data) => {
        if (data == '\r') {
          // 敲回车
          processCommand(commandBuffer);
          term.writeln("\r");
          commandBuffer = '';
        } else if (data == '\u007f') {
          // 敲删除
          if (commandBuffer.length > 0) {
            commandBuffer = commandBuffer.slice(0, -1);
            term.write('\b \b');
          }
        } else {
          // 正常敲
          commandBuffer += data;
          term.write(`${data}`);
        }
      });

      const { host , port , username , password } = connectConfig;
      term.writeln(`Connect to ${host}`);
      window.electron.ssh2.connect( host , port , username , password )
        .then((chunk: any) => {
          console.log(`Connect to ${host} successed,Receive::` , chunk);
        })
        .catch((err: any) => {
          console.log("error:", err)
        });

    }
  }, [terminalInstance]);

  const processCommand = (command: string) => {
    console.log("execute command :", command);
    const term = terminalInstance.current;
    if (term) {
      window.electron.ssh2.execute(command)
        .then((chunk: any) => {
          console.log(`[${command}]\n${chunk.toString()}`)
        })
        .catch((err: any) => {

        });
    }
  }

  return <>
    <div ref={terminalRef} style={{ width: '100%', height: '600px', background: "black", padding: "5px" }} />
  </>

})
