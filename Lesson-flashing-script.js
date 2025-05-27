// ==UserScript==
// @name         中南大学继续教育自动刷课（最终版）
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  自动播放视频、答题、切换课程
// @match        https://cws.edu-edu.com/*
// @match        https://zjpx.csu.edu.cn/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    // 防止网页检测失焦或切屏行为
    window.addEventListener('blur', function(e) {
        e.stopImmediatePropagation();
        console.log("🚫 阻止 window.blur 事件");
    }, true);

    document.addEventListener('visibilitychange', function(e) {
        e.stopImmediatePropagation();
        if (document.visibilityState !== 'visible') {
            Object.defineProperty(document, 'visibilityState', {
                configurable: true,
                get: () => 'visible',
            });
            console.log("🚫 阻止 visibilitychange 事件");
        }
    }, true);

    // 强制 document.hasFocus() 始终为 true
    Object.defineProperty(document, 'hasFocus', {
        configurable: true,
        value: () => true
    });

    console.log("🟢 自动刷课脚本已启动 - 最终版");

    // 状态变量
    let isHandling = false;
    let videoEnded = false;

    // 主循环
    const mainLoop = setInterval(() => {
        if (isHandling) return;

        // 1. 优先处理防挂机题目
        if (handleAntiIdleQuestion()) {
            return;
        }

        // 2. 处理视频播放
        handleVideoPlayback();

        // 3. 处理播放完成弹窗
        if(videoEnded){
            handleNextChapterModal();
            videoEnded = false;
            setTimeout(() => {
                location.reload(true); // 5秒后强制刷新
            }, 5000);
        }
    }, 5000);

    // 处理防挂机题目
    function handleAntiIdleQuestion() {
        const questionBox = document.querySelector('.questionBox');
        if (!questionBox) return false;

        isHandling = true;
        console.log("📢 检测到防挂机题目");

        const questionText = questionBox.innerText.trim();
        const match = questionText.match(/(\d+)\s*([+\-*/])\s*(\d+)/);

        if (match) {
            const [, a, op, b] = match;
            let answer;
            switch (op) {
                case '+': answer = +a + +b; break;
                case '-': answer = a - b; break;
                case '*': answer = a * b; break;
                case '/': answer = a / b; break;
            }

            console.log(`✏️ 计算: ${a} ${op} ${b} = ${answer}`);

            // 选择正确答案
            const options = document.querySelectorAll('.ivu-radio-wrapper');
            options.forEach(opt => {
                if (opt.innerText.trim() === String(answer)) {
                    opt.click();
                    console.log("✅ 已选择正确答案");
                }
            });

            // 点击确定按钮
            setTimeout(() => {
                const confirmBtn = document.querySelector('.btnBox button');
                if (confirmBtn) {
                    confirmBtn.click();
                    console.log("🆗 已点击确定按钮");
                }
                // 添加延迟等待页面更新
                setTimeout(() => {
                    isHandling = false;
                }, 3000); // 3秒后恢复检测
                isHandling = false;
            }, 1500);
            setTimeout(() => {
                location.reload(true); // 120秒后强制刷新
            }, 120000);
            return true;
        } else {
            console.warn("❌ 无法识别的题目格式");
            isHandling = false;
            return false;
        }
    }

    // 处理视频播放
    function handleVideoPlayback() {
        const video = document.querySelector('video');
        if (!video) return;

                // 检测视频是否结束
        if (!isNaN(video.duration) && video.currentTime >= video.duration - 1) {
            videoEnded = true;
            console.log("🏁 视频播放完毕");
        }

        // 自动播放暂停的视频
        if (video.paused && !videoEnded) {
            video.play()
                .then(() => console.log("▶️ 视频已开始播放"))
                .catch(err => console.warn("⚠️ 播放失败:", err));
        }


    }

    // 处理下一章节弹窗
    function handleNextChapterModal() {
        const modals = document.querySelectorAll('.ivu-modal-body');
        let targetModal = null;

        modals.forEach(modal => {
            if (modal.textContent.includes('当前章节已经播放完毕')) {
                targetModal = modal;
            }
        });

        isHandling = true;
        console.log("🔄 检测到播放完成弹窗");

        // 更智能的按钮查找方式
        const buttons = targetModal.querySelectorAll('button');
        let playNextBtn = null;

        buttons.forEach(btn => {
            if (btn.textContent.includes('播放')) {
                playNextBtn = btn;
            }
        });

        if (playNextBtn) {
            console.log("⏭️ 找到播放下一章节按钮");
            // 模拟更真实的点击
            playNextBtn.focus();
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            playNextBtn.dispatchEvent(clickEvent);

            // 备用点击方式
            setTimeout(() => {
                console.log("✅ 已点击播放按钮");
                videoEnded = false;
                isHandling = false;
            }, 500);
        } else {
            console.warn("❌ 未找到播放按钮");
            isHandling = false;
        }
    }

    // 页面卸载时清除定时器
    window.addEventListener('unload', () => {
        clearInterval(mainLoop);
    });
})();
