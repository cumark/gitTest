define(['common/urlApi', 'lib/toastr/toastr.min', 'lib/template-4.13.1', 'lib/jedate-6.5.0/js/jedate', 'lib/echarts.min'], function (urlapi, toastr, template, jeDate, echarts) {
    function EnergyReport() {
        this.energyUnits = [];//能耗单位数组,当前单位为energyUnits[$(".input-energyType").get(0).selectedIndex]
        this.currentUnit="";
        this.date="";
        this.searchParam = {
            energyType: 0,   //能耗类型
            timeType: 0,   //时间类型
        }
    }

    EnergyReport.prototype = {
        init: function () {

            // 控件初始化
            this.controlWidgetInit();

            // 事件绑定
            this.bindEvent();

            // 获取能耗类型下拉框数据
            this.energyTypeInit();

            // 获取能耗报表
            this.getEenergyReport();
        },

        // 控件初始化
        controlWidgetInit: function () {
            let _this = this;
            // 设置元素高度
            $(".myWidgetHeight").height(($(window).height() - 280) / 2);
            $("#temperatureChart").height(($(window).height() - 280) / 2 - 20);

            $(window).on('resize', function () {
                // 设置元素高度
                $(".myWidgetHeight").height(($(window).height() - 280) / 2);
                $("#temperatureChart").height(($(window).height() - 280) / 2 - 20);

            });

            jeDate('#inputYear',{
                theme:{ bgcolor:"#2B569A",color:"#fff", pnColor:"#ccc"},
                format: 'YYYY',
                isinitVal:true,
                isClear: false,
                onClose:false
            });
            jeDate('#inputMonth',{
                theme:{ bgcolor:"#2B569A",color:"#fff", pnColor:"#ccc"},
                format: 'YYYY-MM',
                isinitVal:true,
                isClear: false,
                onClose:false
            });
            jeDate('#inputDay',{
                theme:{ bgcolor:"#2B569A",color:"#fff", pnColor:"#ccc"},
                format: 'YYYY-MM-DD',
                isinitVal:true,
                isClear: false,
                onClose:false
            });

            // 根据timeType显示对应时间输入框
            $(".input-timeType").select2({ minimumResultsForSearch: -1}).on("change", function () {

                switch($(".input-timeType").val()){
                    case "0": $("#inputYear").show(); $("#inputMonth").hide(); $("#inputDay").hide(); break;
                    case "1": $("#inputYear").hide(); $("#inputMonth").show(); $("#inputDay").hide(); break;
                    case "2": $("#inputYear").hide(); $("#inputMonth").hide(); $("#inputDay").show(); break;
                    default:
                }

            });

        },

        // 按钮绑定事件
        bindEvent: function(){
            let _this = this;
            //查询按钮
            $("#btn-search").on("click", function () {
                _this.getEenergyReport();

            });

            $("#btn-exportExcel").on("click",function(){
                _this.exportToExcel();
            })

        },


        // 获取能耗类型下拉框数据
        energyTypeInit: function(){
            let _this = this;
            $.ajax({
                url: "/yunke-gateway/yunke-energy/energyCode/api/listForEnergy?hasChild=1",
                dataType: "json",
                async: false, //必须关闭异步，否则初始能耗类型下拉框取值为空
                type: "GET",
                success: function (json) {
                    let typeList=[]
                    json.forEach((item)=>{
                        _this.energyUnits.push(item.unit);
                        typeList.push({'id':item.code,'text':item.name});
                    })
                        typeList.shift();//删除首元素：”总能耗“,这类能耗在数据据表中查不到,也不易理解。
                        _this.energyUnits.shift();
                    // 能耗类型-填充选择框
                    $("select.input-energyType").select2({
                        minimumResultsForSearch: -1,
                        data: typeList
                    });
                }
            });
            // $('.input-energyType').find('option[value='+'电'+']').attr('selected',true);
        },

        // 能耗报表
        getEenergyReport: function () {
            let _this = this;
            switch($(".input-timeType").val()){
                case "0": _this.date=$("#inputYear").val()+"-01-01"; break;
                case "1": _this.date=$("#inputMonth").val()+"-01"; break;
                case "2": _this.date=$("#inputDay").val(); break;
                default:
            }

            _this.currentUnit=_this.energyUnits[$(".input-energyType").get(0).selectedIndex];
            $("#energyValue").text("能耗值("+_this.currentUnit+")");//表头根据单位动态更改
            $.get({
                url: "/yunke-gateway/yunke-energy/energyReport/getReport",
                dataType: "json",
                type: "GET",
                data: {
                    energyCode: $(".input-energyType").val(),
                    timeType: $(".input-timeType").val(),
                    date: _this.date
                },
                beforeSend: function () {
                    $oms.common.loading('.panel-list', 'show');
                },
                success: function (json) {
                    if(json.energyReportDetailVoList.length!==0){

                        json.energyReportDetailVoList.push({//将总计加入到列表最后一行
                            deptName:"总计：",
                            energyValue:json.totalEnergy,
                            costValue:json.totalCost
                        })

                    } else {
                        $oms.common.toastr({
                            toastr: toastr,
                            text: "未查询到报表数据,请重新选择！",
                            state: "error"
                        });
                    }

                    let items = template("energyReportList", json);
                    $(".table-energyReport tbody").html(items);
                },
                complete: function () {
                    $oms.common.loading('.panel-list', 'hide');
                }
            });
        },

        exportToExcel: function () {
            let _this = this;
            $.get({
                url: "/yunke-gateway/yunke-energy/energyReport/exportReport",
                dataType: "json",
                type: "GET",
                data: {
                    energyCode: $(".input-energyType").val(),
                    timeType: $(".input-timeType").val(),
                    date: _this.date
                },

                success: function (json) {
                    if (json.status.success) {
                        if (json.resultBody.code == 200) {
                            $oms.common.exportResource(json.resultBody.msg);
                        } else {
                            $oms.common.toastr({
                                toastr: toastr,
                                text: json.resultBody.msg,
                                state: "error"
                            });
                        }
                    } else {
                        $oms.common.toastr({
                            toastr: toastr,
                            text: json.status.exceptionMsg,
                            state: "error"
                        });
                    }
                },

            });
        }


    };

    return EnergyReport;
});
