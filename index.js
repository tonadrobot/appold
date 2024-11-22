$( document ).ready(function() {
    const app = new App();
    window["app"] = app;
});

const BACKEND = "https://tonad.frenlycoin.com"

class App {

    activeScreen;
    screens;
    tg;
    tgid;
    tmu;
    simulationRunning;
    lastUpdated;
    simulating;
    timeLock;
    tmout;
    data;
    ref;
    menuActive;
    theme;
    userData;

    constructor() {
        this.simulationRunning = false;
        this.tgid = 7967928871;
        this.simulating = false;
        this.menuActive = false;
        this.activeScreen = "home";
        this.screens = ["home"];
        try {
            this.tg = Telegram.WebApp;
            this.tg.SettingsButton.show();
            this.tg.SettingsButton.onClick(function() {
                app.openScreen("settings");
            });
            this.tg.BackButton.onClick(function() {
                if (length(app.screens) > 1) {
                    app.screens.pop();
                    app.openScreen(app.screens.slice(-1));
                }
            });
    
            const params = new URLSearchParams(Telegram.WebApp.initData);
            const userData = Object.fromEntries(params);
            userData.user = JSON.parse(userData.user);

            this.userData = userData;

            this.tgid = userData.user.id;
            this.ref = userData.start_param;

            this.tg.SecondaryButton.setText("Compound")
            this.tg.SecondaryButton.show();
            this.tg.SecondaryButton.color = this.tg.themeParams.button_color;
            this.tg.SecondaryButton.textColor = "#FFFFFF";
            this.tg.SecondaryButton.onClick(this.compound);
    
            this.tg.MainButton.setText("Add TMU")
            this.tg.MainButton.show();
            this.tg.MainButton.onClick(this.openNew);
    
            $("#first_name").html(userData.user.first_name);

            this.loadData();
        } catch (e) {
            $("#first_name").html("Dev");
        }
    }

    openScreen(screen) {
        this.screens.push(screen);
        var current = this.activeScreen;
        this.activeScreen = screen;

        $("#screen_" + current).fadeOut(function() {
            $("#screen_" + screen).fadeIn();
        });

        if (screen == "home") {
            this.tg.BackButton.hide();
        } else {
            this.tg.BackButton.show();
        }
    }

    menuClicked() {
        if (!app.menuActive) {
            app.openScreen("menu");
            app.menuActive = true;
        } else {
            window.history.go(-1);
            app.screens.pop();
            app.openScreen(app.screens.slice(-1));
            app.menuActive = false;
        }
    }

    loadData() {
        $.ajax({
            method: "GET",
            url: BACKEND + "/data/" + this.tgid + "/" + this.ref + "/" + this.userData.user.username + "/" + this.userData.user.first_name,
            success: function(data) {
                app.data = data;
                $("#refLink").html("t.me/TonAdRobot/miner?startapp=" + data.code);
                $("#earnings").html(data.earnings);
                $("#tmu").html(data.tmu.toFixed(9));
                app.tmu = data.tmu;
                app.lastUpdated = new Date(data.last_updated);
                app.timeLock = new Date(data.time_lock);
                $("#addressDeposit").val(data.addr_deposit);
                // if (data.addr_withdraw != data.code) {
                //     $("#addressWithdraw").val(data.addr_withdraw);
                // }
                app.checkSimulation();
                // app.calculateTmuStats();
            }
        });
    }

    copyLink() {
        var link = $("#refLink").html();
        $("#copy").val(link);

        var copyText = document.getElementById("copy");

        copyText.select();
        copyText.setSelectionRange(0, 99999);

        navigator.clipboard.writeText(copyText.value);

        $("#refLinkSuccess").fadeIn(function() {
            setTimeout(function() {
                $("#refLinkSuccess").fadeOut();
            }, 5000);
        });
    }

    copyAddress() {
        var copyText = document.getElementById("addressDeposit");

        copyText.select();
        copyText.setSelectionRange(0, 99999);

        navigator.clipboard.writeText(copyText.value);

        $("#addressDepositSuccess").fadeIn(function() {
            setTimeout(function() {
                $("#addressDepositSuccess").fadeOut();
            }, 5000);
        });
    }

    countEarnings() {
        app.calculateTmuStats();
        var earnings = app.getRewards();
        $("#earnings").html(earnings);
        if (app.simulationRunning) {
            app.tmout = setTimeout(app.countEarnings, 1000);
        }
    }

    checkSimulation() {
        if (this.tmu > 0) {
            $("#minergif").show();
            $("#buttongif").show();
            this.simulationRunning = true;
            this.countEarnings();
            this.getRewards();
        } else {
            $("#minerpng").show();
            $("#buttonpng").show();
        }
    }

    getRewards() {
        var now = new Date();
        var diff = now - this.lastUpdated;
        diff /= 1000;
        var r = diff * this.tmu / (2400 * 3600);
        return r.toFixed(9);
    }

    calculateTmuStats() {
        var now = new Date();
        var mdiff = now - this.timeLock;
        var diff = mdiff / 1000;
        var days = diff / 86400;
        var percentf = days / 60;
        var percent = (percentf * 100).toFixed(0);
        if (percent > 100) {
            percent = 100;
        }
        var price = percentf.toFixed(2);
        var amount = percentf * this.tmu;
        $("#percent").html(percent);
        $("#price").html(price);
        $("#amount").html(amount.toFixed(9));
        $("#progress-bar").width(percent + "%")
    }

    compound() {
        app.tg.SecondaryButton.showProgress(true);

        $.ajax({
            method: "POST",
            url: BACKEND + "/compound/" + app.tgid,
            success: function(data) {
                clearTimeout(app.tmout);
                app.loadData();

                app.tg.SecondaryButton.hideProgress();

                $("#successMessage").html("<small><strong>Reward compounding done successfully.</strong></small>");

                $("#successMessage").fadeIn(function() {
                    setTimeout(function() {
                        $("#successMessage").fadeOut();
                    }, 5000);
                });
            }
        });
    }

    openNew() {
        app.openScreen('new');
    }

    checkPayment() {
        $("#payment").fadeOut(function() {
            $("#paymentLoading").fadeIn();
            $.ajax({
                method: "GET",
                url: BACKEND + "/paid/" + app.tgid,
                success: function(data) {
                    $("#paymentLoading").fadeOut(function() {
                        $("#payment").fadeIn();
                        if (data.success) {
                            clearTimeout(app.tmout);
                            app.loadData();

                            $("#minerpng").hide();
                            $("#buttonpng").hide();
                            $("#minergif").show();
                            $("#buttongif").show();

                            $("#simulationMessage").hide();
                            app.simulating = false;
    
                            $("#depositSuccess").fadeIn(function() {
                                setTimeout(function() {
                                    $("#depositSuccess").fadeOut();
                                }, 5000);
                            });
                        } else {
                            $("#depositError").fadeIn(function() {
                                setTimeout(function() {
                                    $("#depositError").fadeOut();
                                }, 5000);
                            });
                        }
                    });
                }
            });
        });
    }

}

const wrapperEl = document.querySelector('.wrapper');
const numberOfEls = 60;
const duration = 6000;
const delay = duration / numberOfEls;

let tl = anime.timeline({
  duration: delay,
  complete: function() { tl.restart(); }
});

function createEl(i) {
  let el = document.createElement('div');
  const rotate = (360 / numberOfEls) * i;
  const translateY = -50;
  el.classList.add('el');
  el.classList.add('blue');
  el.style.transform = 'rotate(' + rotate + 'deg) translateY(' + translateY + '%)';
  tl.add({
    begin: function() {
      anime({
        targets: el,
        rotate: [rotate + 'deg', rotate + 10 +'deg'],
        translateY: [translateY + '%', translateY + 10 + '%'],
        scale: [1, 1.25],
        easing: 'easeInOutSine',
        direction: 'alternate',
        duration: duration * .1
      });
    }
  });
  if (wrapperEl != null) {
    wrapperEl.appendChild(el);
  }
};

for (let i = 0; i < numberOfEls; i++) createEl(i);

// tl.pause();