/*
 Yomitai js
 Copyright (c) 2019 CALIL Inc.
 This software is released under the MIT License.
 http://opensource.org/licenses/mit-license.php

 図書館API仕様書 | カーリル
 https://calil.jp/doc/api_ref.html
*/


import {
    check
} from './api_calil.js'

export default class Yomitai {
    constructor(props) {
        this.props = props;
        this.api_calil = null;

        this.props.books = []
        // 蔵書状況を初期化
        this.props.isbns.map((isbn) => {
            let book = {};
            book.isbn = isbn;
            book.apiResult = null;
            book.statusText = '';
            book.statusId = 'nostatus';
            this.props.books.push(book);
        });

        // isbnの配列を作成
        let isbns = [];
        this.props.books.map((book) => {
            if (book.isbn) isbns.push(book.isbn);
        });
        this.check(isbns, this.props.systemids);
    }


    /** すべての図書館のlibkeyをまとめる
     * @param data
     * @returns {{}}
     */
    getLibkeys(data) {
        let libkeys = {};
        for (let systemid in data) {
            if (data[systemid].status === 'OK' || data[systemid].status === 'Cache') {
                let count = 0;
                // すべての図書館のlibkeyをまとめる
                for (let key in data[systemid].libkey) {
                    // systemid+count をユニークなキーにする
                    libkeys[systemid + count] = data[systemid].libkey[key];
                    count += 1;
                }
            }
        }
        return libkeys;
    }

    // /**
    //  * ステータスの優先順位を数字で取得
    //  * @returns {number}
    //  */
    // getPriority(status) {
    //     var priorities = {
    //         "貸出可": 100,
    //         "蔵書あり": 90,
    //         "館内のみ": 80,
    //         "貸出中": 70,
    //         "準備中": 60,
    //         "予約中": 50,
    //         "蔵書なし": 40
    //     };
    //     if (priorities[status]) {
    //         return parseInt(priorities[status]);
    //         //その他 行方不明,長期延滞,etc
    //     } else if (status != undefined && status != '') {
    //         return 10;
    //     }
    //     return 0;
    // }


    /**
     * libkeysの一番高いpriorityを返す
     * @param data
     * @returns {number}
     */
    getHighestPriority(data) {
        let libkeys = this.getLibkeys(data);
        let priority = 0;
        for (let key in libkeys) {
            if (this.getPriority(libkeys[key]) > priority) {
                priority = this.getPriority(libkeys[key]);
            }
        }
        return priority;
    }

    /**
     * libkeysのpriorityを１つずつ調べて、一番優先順位が高いステータスにする
     * 同じpriorityの場合(例): 行方不明,長期延滞)、最初のlibkeyが返される
     * @param data
     * @returns {string}
     */
    getHighestPriorityStatus(data) {
        let libkeys = this.getLibkeys(data);
        let status = '';
        let priority = 0;
        for (let key in libkeys) {
            if (this.getPriority(libkeys[key]) > priority) {
                status = libkeys[key];
                priority = this.getPriority(libkeys[key]);
            }
        }
        return status;
    }

    /**
     * ステータスを英語にする
     * @param status
     * @returns {string}
     */
    getStatusId(status) {
        let statusId = '';
        const statusIds = {
            '貸出可': 'available',
            '蔵書あり': 'exist',
            '館内のみ': 'inlibrary',
            '貸出中': 'lending',
            '予約中': 'reserved',
            '準備中': 'ordering'
        };
        if (statusIds[status]) {
            statusId = statusIds[status];
        } else {
            // 知らないstatusがきたら、"蔵書あり"と同等に扱う 例) 長期延滞、行方不明
            statusId = 'hold';
        }
        return statusId;
    }


    // old(data) {
    //     let runningCount = 1;
    //     let runningThreshold = 3; // 検索中を表示する数
    //     this.props.books.map((book) => {
    //         // ステータスコンポーネントに渡す statusId,statusTextを作る
    //         let statusText = '';
    //         let statusId = 'nostatus';
    //         if (data.books[book.isbn]) {
    //             book.apiResult = data.books[book.isbn];
    //             // 検索完了
    //             if (data.continue === 0) {
    //                 // すべてのシステムがError
    //                 let isErrorAll = true;
    //                 for (let systemid in data) {
    //                     if (data[systemid].status !== 'Error') {
    //                         isErrorAll = false;
    //                     }
    //                 }
    //                 if (isErrorAll) {
    //                     statusId = 'error';
    //                     statusText = '検索失敗';
    //                     // libkeyがひとつもない->蔵書なし
    //                 } else if (Object.keys(this.getLibkeys(book.apiResult)).length == 0) {
    //                     statusId = '';
    //                     statusText = '蔵書なし';
    //                     // 結果を表示
    //                 } else {
    //                     // 貸出可、 蔵書あり、 館内のみ、 貸出中、 予約中、 準備中、 休館中、 蔵書なし etc
    //                     statusText = this.getHighestPriorityStatus(book.apiResult);
    //                     statusId = this.getStatusId(statusText);
    //                 }
    //                 // 検索途中
    //             } else if (book.apiResult !== null) {
    //                 // すべてのlibkey.statusがOKorCacheで、libkeyがない->蔵書なし
    //                 let isRunning = false;
    //                 for (let systemid in book.apiResult) {
    //                     if (book.apiResult[systemid].status === 'Running') {
    //                         isRunning = true;
    //                     }
    //                 }
    //                 if (isRunning === false && Object.keys(this.getLibkeys(book.apiResult)).length == 0) {
    //                     statusId = '';
    //                     statusText = '蔵書なし';
    //                     // 検索の途中であれば40点以下は表示しない(例:蔵書なし)
    //                 } else if ((isRunning || data.continue === 1) && this.getHighestPriority(book.apiResult) <= 40) {
    //                     // ３個まで検索中にする
    //                     if (runningCount <= runningThreshold) {
    //                         statusText = '検索中';
    //                         statusId = 'running';
    //                         runningCount += 1;
    //                     }
    //                 } else {
    //                     // 貸出可、 蔵書あり、 館内のみ、 貸出中、 予約中、 準備中、 休館中、 蔵書なし etc
    //                     statusText = this.getHighestPriorityStatus(book.apiResult);
    //                     statusId = this.getStatusId(statusText);
    //                 }
    //             }
    //             // まだAPIの結果が来ていない
    //         } else {
    //             // ３個まで検索中にする
    //             if (runningCount <= runningThreshold) {
    //                 statusText = '検索中';
    //                 statusId = 'running';
    //                 runningCount += 1;
    //             }
    //         }
    //         if (data.status === 'timeout') {
    //             book.statusText = 'タイムアウト';
    //             book.statusId = 'error';
    //         } else {
    //             book.statusText = statusText;
    //             book.statusId = statusId;
    //         }
    //     });
    // }


    new(data) {
        let runningCount = 1;
        let runningThreshold = 3; // 検索中を表示する数
        this.props.books.map((book) => {
            // ステータスコンポーネントに渡す statusId,statusTextを作る
            let statusText = '';
            let statusId = 'nostatus';
            if (data.books[book.isbn]) {
                Object.values(this.getLibkeys(data.books[book.isbn])).map((libkey) => {
                    // 空なら来たやつを入れる
                    if (statusText === '') {
                        statusId = this.getStatusId(libkey);
                        statusText = libkey;
                    // 貸出可が来たときに入れる
                    } else if (libkey === '貸出可') {
                        statusId = this.getStatusId(libkey);
                        statusText = libkey;
                    }
                })
            } else {
                if (runningCount <= runningThreshold) {
                    statusText = '検索中';
                    statusId = 'running';
                    runningCount += 1;
                }
            }
            book.statusText = statusText;
            book.statusId = statusId;
        });
    }

    /**
     * 蔵書検索
     * @param isbns
     * @param systemids
     */
    check(isbns, systemids) {

        // 蔵書状況をリセット
        this.props.books.map((book) => {
            book.apiResult = null;
            book.statusText = '';
            book.statusId = 'nostatus';
        });

        if (this.api_calil) this.api_calil.kill();
        this.api_calil = new check(this.props.appkey, isbns.join(','), systemids.join(','), (data) => {
            if (data.continue === 0) {
                this.api_calil.kill();
            }
            if (data.status === 'timeout') {
                this.props.books.map((book) => {
                    book.statusText = 'タイムアウト';
                    book.statusId = 'error';
                });
            } else {
                // this.old(data);
                this.new(data);
            }
            this.props.callback(this.props.books);
        });

    }

}