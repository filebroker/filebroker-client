import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {App, LoadingPage} from './App';
import reportWebVitals from './reportWebVitals';
import http from "./http-common";
import {LoginResponse} from './Login';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <React.StrictMode>
        <LoadingPage/>
    </React.StrictMode>
);

http.post<LoginResponse>("/refresh-login")
    .then(response => {
        root.render(
            <React.StrictMode>
                <App initialLogin={response.data}/>
            </React.StrictMode>
        );
    })
    .catch(() => {
        root.render(
            <React.StrictMode>
                <App initialLogin={null}/>
            </React.StrictMode>
        );
    });

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
