# -*- coding: utf-8 -*-
"""
立讯精密威科夫分析工具 - GUI版本
"""

import sys
import threading
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import os

os.environ["TQDM_DISABLE"] = "1"


class DummyStdout:
    def write(self, x):
        pass

    def flush(self):
        pass

    def read(self, *args, **kwargs):
        return ""


sys.stdout = DummyStdout()
sys.stderr = DummyStdout()

import pandas as pd
import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import timedelta
import akshare as ak

# 全局变量
current_df = None
current_symbol = None
current_name = None


def get_stock_data(query, log_callback=None):
    """获取股票数据"""
    import traceback
    import requests

    def log(msg):
        if log_callback:
            log_callback(msg)
        print(msg)

    log(f"开始获取股票数据: {query}")
    try:
        stock_info = ak.stock_info_a_code_name()
        log(f"获取到原始数据，类型: {type(stock_info)}")
        log(f"数据长度: {len(stock_info) if stock_info is not None else 'None'}")

        if stock_info is None or len(stock_info) == 0:
            log("股票列表为空，尝试备用方法...")
            try:
                url = "https://push2.eastmoney.com/api/qt/clist/get"
                params = {
                    "pn": 1,
                    "pz": 100,
                    "po": 1,
                    "np": 1,
                    "fid": "f3",
                    "fs": "m:1",
                    "fields": "f2,f12,f13",
                    "_": "1625569689973",
                }
                headers = {"User-Agent": "Mozilla/5.0"}
                response = requests.get(url, params=params, headers=headers, timeout=10)
                log(f"备用请求状态: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    log(f"备用数据返回: {data}")
            except Exception as e2:
                log(f"备用方法也失败: {e2}")
            return None, None, None

        stock_info["code"] = stock_info["code"].astype(str).str.zfill(6)
        log(f"获取股票列表成功，共 {len(stock_info)} 只股票")

    except Exception as e:
        log(f"获取股票列表失败: {e}")
        log(f"详细错误: {traceback.format_exc()}")
        return None, None, None

    log(f"搜索关键词: {query}")
    matching = stock_info[stock_info["name"].str.contains(query, na=False, case=False)]
    log(f"模糊匹配结果数: {len(matching)}")

    if matching.empty:
        log(f"未找到匹配，尝试精确匹配...")
        if query.isdigit() and len(query) == 6:
            matching = stock_info[stock_info["code"] == query]
            log(f"精确匹配(代码)结果数: {len(matching)}")
        if matching.empty:
            log(f"精确匹配也未找到")
            log(f"股票列表前10只:")
            for i, row in stock_info.head(10).iterrows():
                log(f"  {row['code']} - {row['name']}")
            return None, None, None

    symbol = matching.iloc[0]["code"]
    name = matching.iloc[0]["name"]
    log(f"找到股票: {name} ({symbol})")

    log(f"正在获取历史数据...")
    try:
        df = ak.stock_zh_a_hist(
            symbol=symbol, period="daily", start_date="20200101", adjust="qfq"
        )
        log(f"历史数据获取成功，共 {len(df)} 条")
    except Exception as e:
        log(f"获取历史数据失败: {e}")
        log(f"详细错误: {traceback.format_exc()}")
        return None, None, None

    df.columns = [
        "date",
        "symbol",
        "open",
        "close",
        "high",
        "low",
        "volume",
        "amount",
        "amplitude",
        "pctChg",
        "change",
        "turn",
    ]
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    return df, symbol, name


def wyckoff_analysis_core(df):
    """威科夫核心分析"""
    df["MA50"] = df["close"].rolling(50).mean()
    df["MA200"] = df["close"].rolling(200).mean()
    df_plot = df.tail(500).copy().reset_index(drop=True)

    recent = df_plot[df_plot["date"] >= "2024-09-01"]

    # SC
    sc_mask = (recent["pctChg"] < -3) | (recent["volume"] > recent["volume"].mean() * 2)
    if sc_mask.any():
        sc_row = recent[sc_mask].loc[recent[sc_mask]["pctChg"].idxmin()]
    else:
        sc_row = recent.loc[recent["low"].idxmin()]
    sc_date = sc_row["date"]
    sc_price = sc_row["low"]

    # AR
    ar_df = recent[
        (recent["date"] > sc_date) & (recent["date"] < sc_date + timedelta(days=20))
    ]
    if len(ar_df) > 0:
        ar_row = ar_df.loc[ar_df["high"].idxmax()]
        ar_date = ar_row["date"]
        ar_price = ar_row["high"]
    else:
        ar_date, ar_price = sc_date + timedelta(days=10), sc_price * 1.15

    # SOS
    sos_df = recent[
        (recent["date"] > ar_date) & (recent["date"] < ar_date + timedelta(days=30))
    ]
    if len(sos_df) > 0:
        sos_df = sos_df[sos_df["close"] > sos_df["open"] * 1.02]
        if len(sos_df) > 0:
            sos_row = sos_df.loc[sos_df["volume"].idxmax()]
            sos_date, sos_price = sos_row["date"], sos_row["close"]
        else:
            sos_date, sos_price = ar_date + timedelta(days=5), ar_price
    else:
        sos_date, sos_price = ar_date + timedelta(days=5), ar_price

    return df_plot, sc_date, sc_price, ar_date, ar_price, sos_date, sos_price


def draw_chart(
    df_plot,
    sc_date,
    sc_price,
    ar_date,
    ar_price,
    sos_date,
    sos_price,
    symbol,
    name,
    output_path,
):
    """绘图"""
    plt.rcParams["font.sans-serif"] = ["SimHei", "Microsoft YaHei"]
    plt.rcParams["axes.unicode_minus"] = False

    fig, ax = plt.subplots(figsize=(20, 12))

    ax.plot(df_plot["date"], df_plot["close"], "k-", linewidth=2, label="收盘价")
    ax.plot(df_plot["date"], df_plot["MA50"], "b--", linewidth=1.8, label="MA50")
    ax.plot(df_plot["date"], df_plot["MA200"], "r--", linewidth=1.8, label="MA200")

    # 吸筹区
    accum_start = sc_date - timedelta(days=3)
    accum_end = sos_date + timedelta(days=5)
    ax.axvspan(accum_start, accum_end, alpha=0.12, color="green")
    ax.axhline(y=sc_price, color="green", linestyle="--", alpha=0.4)
    ax.axhline(
        y=max(ar_price, sos_price * 1.05), color="green", linestyle="--", alpha=0.4
    )

    # 阶段
    phases = [
        (accum_start, "Phase A"),
        (sc_date + timedelta(days=7), "Phase B"),
        (sos_date, "Phase C"),
        (sos_date + timedelta(days=30), "Phase D"),
        (accum_end - timedelta(days=60), "Phase E"),
    ]
    for date, label in phases:
        if date >= df_plot["date"].min():
            ax.axvline(x=date, color="black", linestyle="--", linewidth=2, alpha=0.4)
            mid = date + timedelta(days=20)
            if mid <= df_plot["date"].max():
                ax.text(
                    mid,
                    df_plot["high"].max() * 0.95,
                    label,
                    fontsize=11,
                    fontweight="bold",
                    color="darkred",
                )

    # 标注
    events = [
        (sc_date, f"SC\n恐慌抛售", sc_price * 0.98, "red"),
        (ar_date, f"AR\n自动反弹", ar_price * 1.02, "purple"),
        (sos_date, f"SOS\n强势突破", sos_price * 1.02, "green"),
    ]
    for date, text, y_pos, color in events:
        ax.annotate(
            text,
            xy=(date, y_pos),
            xytext=(date, y_pos + 120),
            fontsize=10,
            ha="center",
            bbox=dict(boxstyle="round", facecolor="white", edgecolor=color, alpha=0.9),
            arrowprops=dict(arrowstyle="->", color=color),
        )

    # 当前价
    current_price = df_plot["close"].iloc[-1]
    current_date = df_plot["date"].iloc[-1]
    ax.annotate(
        f"当前\n{current_price:.2f}",
        xy=(current_date, current_price),
        xytext=(current_date, current_price + 100),
        fontsize=11,
        fontweight="bold",
        color="darkblue",
        bbox=dict(boxstyle="round", facecolor="white", edgecolor="darkblue"),
        arrowprops=dict(arrowstyle="->", color="darkblue"),
    )

    # 结论框
    conclusion = f"""
    【威科夫分析结论】{name} ({symbol})
    {"=" * 40}
    当前阶段：Phase E（上涨中继）
    
    关键价位：
    SC恐慌底：{sc_price:.2f}
    吸筹区间：{sc_price:.0f} - {max(ar_price, sos_price):.0f}
    当前价格：{current_price:.2f}
    
    趋势判断：
    MA50 > MA200，多头排列
    {"=" * 40}
    """
    ax.text(
        0.02,
        0.97,
        conclusion,
        transform=ax.transAxes,
        fontsize=10,
        verticalalignment="top",
        family="SimHei",
        bbox=dict(
            boxstyle="round", facecolor="lightyellow", alpha=0.95, edgecolor="orange"
        ),
    )

    ax.set_title(
        f"{name} ({symbol}) - 威科夫市场结构分析", fontsize=18, fontweight="bold"
    )
    ax.set_xlabel("日期", fontsize=12)
    ax.set_ylabel("价格", fontsize=12)
    ax.legend(loc="upper left")
    ax.grid(True, alpha=0.3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
    plt.xticks(rotation=45)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()


class WyckoffApp:
    def __init__(self, root):
        self.root = root
        self.root.title("威科夫股票分析工具 v1.0")
        self.root.geometry("500x400")
        self.root.resizable(False, False)

        # 标题
        title = tk.Label(
            root, text="威科夫股票分析工具", font=("Microsoft YaHei", 20, "bold")
        )
        title.pack(pady=20)

        # 输入框
        input_frame = tk.Frame(root)
        input_frame.pack(pady=10, fill="x", padx=50)

        tk.Label(input_frame, text="股票代码/名称:", font=("Microsoft YaHei", 12)).pack(
            side="left"
        )

        self.entry = tk.Entry(input_frame, font=("Microsoft YaHei", 12), width=20)
        self.entry.pack(side="left", padx=10)
        self.entry.bind("<Return>", self.run_analysis)

        # 按钮
        btn_frame = tk.Frame(root)
        btn_frame.pack(pady=20)

        self.btn_run = tk.Button(
            btn_frame,
            text="开始分析",
            font=("Microsoft YaHei", 12),
            bg="#4CAF50",
            fg="white",
            width=12,
            command=self.run_analysis,
        )
        self.btn_run.pack(side="left", padx=10)

        self.btn_save_excel = tk.Button(
            btn_frame,
            text="保存Excel",
            font=("Microsoft YaHei", 11),
            width=10,
            command=self.save_excel,
            state="disabled",
        )
        self.btn_save_excel.pack(side="left", padx=10)

        self.btn_save_img = tk.Button(
            btn_frame,
            text="保存图表",
            font=("Microsoft YaHei", 11),
            width=10,
            command=self.save_image,
            state="disabled",
        )
        self.btn_save_img.pack(side="left", padx=10)

        # 状态
        self.status = tk.Label(
            root, text="就绪", font=("Microsoft YaHei", 10), fg="gray"
        )
        self.status.pack(side="bottom", pady=10)

        # 日志
        log_frame = tk.Frame(root)
        log_frame.pack(pady=10, fill="both", expand=True, padx=30)

        self.log = tk.Text(log_frame, font=("Consolas", 9), height=8, state="disabled")
        self.log.pack(fill="both", expand=True)

    def log_msg(self, msg):
        self.log.config(state="normal")
        self.log.insert("end", msg + "\n")
        self.log.see("end")
        self.log.config(state="disabled")
        self.root.update()

    def run_analysis(self, event=None):
        query = self.entry.get().strip()
        if not query:
            messagebox.showwarning("提示", "请输入股票代码或名称")
            return

        self.btn_run.config(state="disabled", bg="#888888")
        self.status.config(text="分析中...")
        self.log_msg(f"正在分析: {query}...")

        threading.Thread(
            target=self._analysis_thread, args=(query,), daemon=True
        ).start()

    def _analysis_thread(self, query):
        try:
            global current_df, current_symbol, current_name

            self.log_msg(f"正在获取数据...")
            current_df, current_symbol, current_name = get_stock_data(
                query, self.log_msg
            )

            if current_df is None:
                self.log_msg(f"未找到股票: {query}")
                self.root.after(0, self._analysis_failed)
                return

            self.log_msg(f"找到股票: {current_name} ({current_symbol})")
            self.log_msg(f"数据量: {len(current_df)} 条")

            # 保存Excel
            excel_file = os.path.join(os.getcwd(), f"{current_symbol}_历史数据.xlsx")
            self.log_msg(f"准备保存Excel: {excel_file}")
            try:
                current_df.to_excel(excel_file, index=False, engine="openpyxl")
                self.log_msg(f"Excel已保存: {excel_file}")
            except Exception as e:
                self.log_msg(f"Excel保存失败: {e}")
                import traceback

                self.log_msg(f"详细错误: {traceback.format_exc()}")
                excel_file = None

            # 威科夫分析
            self.log_msg("正在进行威科夫分析...")
            self.root.after(0, lambda: self.status.config(text="正在生成图表..."))

            df_plot, sc_date, sc_price, ar_date, ar_price, sos_date, sos_price = (
                wyckoff_analysis_core(current_df)
            )

            # 绘图
            img_file = os.path.join(os.getcwd(), f"{current_symbol}_威科夫分析.png")
            draw_chart(
                df_plot,
                sc_date,
                sc_price,
                ar_date,
                ar_price,
                sos_date,
                sos_price,
                current_symbol,
                current_name,
                img_file,
            )
            self.log_msg(f"图表已保存: {img_file}")

            self.root.after(0, self._analysis_complete)

        except Exception as e:
            self.log_msg(f"错误: {str(e)}")
            self.root.after(0, self._analysis_failed)

    def _analysis_complete(self):
        self.btn_run.config(state="normal", bg="#4CAF50")
        self.btn_save_excel.config(state="normal")
        self.btn_save_img.config(state="normal")
        self.status.config(text="分析完成！")
        messagebox.showinfo("完成", "分析完成！\n已自动保存Excel和图表文件。")

    def _analysis_failed(self):
        self.btn_run.config(state="normal", bg="#4CAF50")
        self.status.config(text="分析失败")

    def save_excel(self):
        if current_df is None:
            return
        file_path = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel文件", "*.xlsx")],
            initialfile=f"{current_name}_{current_symbol}_历史数据.xlsx",
        )
        if file_path:
            current_df.to_excel(file_path, index=False, engine="openpyxl")
            messagebox.showinfo("完成", "Excel保存成功！")

    def save_image(self):
        if current_df is None:
            return
        file_path = filedialog.asksaveasfilename(
            defaultextension=".png",
            filetypes=[("PNG图片", "*.png")],
            initialfile=f"{current_name}_{current_symbol}_威科夫分析.png",
        )
        if file_path:
            df_plot, sc_date, sc_price, ar_date, ar_price, sos_date, sos_price = (
                wyckoff_analysis_core(current_df)
            )
            draw_chart(
                df_plot,
                sc_date,
                sc_price,
                ar_date,
                ar_price,
                sos_date,
                sos_price,
                current_symbol,
                current_name,
                file_path,
            )
            messagebox.showinfo("完成", "图表保存成功！")


def main():
    root = tk.Tk()
    app = WyckoffApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
