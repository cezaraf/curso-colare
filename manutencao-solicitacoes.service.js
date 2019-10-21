class TokenService {

    jobId = null

    constructor($http) {

        this.$http = $http;
    }

    checkTokenOnInit() {

        if (this.jobId) {

            clearInterval(this.jobId);
        }

        return new Promise(async (resolve) => {

            if (!this.isToken() || !this.isTokenValido()) {

                let representacoes = await this.$http.get(ENVIRONMENT['URL_OBTER_REPRESENTACOES']).then((response) => response.data.representacoes)
    
                if (representacoes && representacoes.length > 0) {
    
                    let opcoes = representacoes.map(({ codigo, representacao, unidade }) => { return { text: `${representacao} - ${unidade}`, value: codigo } })
    
                    let opcaoSelecionada = await BootBoxService.selecionarOpcao('SELECIONE A REPRESENTAÇÃO', opcoes)
    
                    let obterTokenResponse = await this.$http.get(ENVIRONMENT['URL_OBTER_TOKEN'](opcaoSelecionada)).then(resp => resp.data)
    
                    this.update(obterTokenResponse);
    
                    resolve(true);
    
                    this.jobId = setInterval(async () => await this.checkTokenOnInit(), 1000)
                }
                
            } else {
    
                resolve(true);
            }
        })
    }

    isToken() {

        return localStorage.getItem('TOKEN_PASSAPORTE') !== null;
    }

    getToken() {

        return JSON.parse(localStorage.getItem('TOKEN_PASSAPORTE'))
    }

    getTokenValue() {

        return this.getToken().token.valor;
    }

    update(token) {

        localStorage.setItem('TOKEN_PASSAPORTE', JSON.stringify(token))
    }

    isTokenValido() {

        return this.isToken() && this.getToken().token.claims.exp > (Date.now() / 1000);
    }
}

class SolicitacaoRepository {

    querySql(query, params) {

        params = params || [];

        return new Promise((resolve, reject) => {

            database.transaction((tx) => tx.executeSql(query, params, 
                
                (tx, result) => resolve(this.sqlResultToArray(result.rows)),
                
                (tx, result) => reject(result)))
        })
    }

    querySqlFirst(query, params) {

        return this.querySql(query, params).then((resultado) => resultado[0]);
    }

    sqlResultToArray(result) {

        let array = [];

        for (let i = 0; i < result.length; i++) {

            array[i] = result[i]
        }

        return array;
    }

    executeSql(sql, params) {

        params = params || [];

        return new Promise((resolve, reject) => {

            database.transaction((tx) => tx.executeSql(sql, params, (tx, result) => resolve(result), (tx, result) => reject(result)));
        })
    }

    listar() {

        return this.querySql("select * from tb_solicitacao order by id desc")

            .then((solicitacoes) => {

                solicitacoes.forEach((solicitacao) => {

                    solicitacao.dataAdmissao = new Date(moment(solicitacao.dataAdmissao).toISOString());

                    solicitacao.dataRequerimento = new Date(moment(solicitacao.dataRequerimento).toISOString());

                    this.querySql("select * from tb_solicitacao_funcao WHERE idSolicitacao = ?", [solicitacao.id])

                        .then((funcoes) => solicitacao.funcao = funcoes);
                })

                return solicitacoes;
            })
    }

    salvar(solicitacao) {

        let sql = `
                        
            INSERT INTO tb_solicitacao 

                (idColare, codTipoSolicitacao, numeroCpf, cargo, dataAdmissao, dataRequerimento, remuneracao, idDocumentoPDF)

            VALUES

                (?, ?, ?, ?, ?, ?, ?, ?);

        `;

        let params = [

            solicitacao.idColare, 
            
            solicitacao.codTipoSolicitacao, 
            
            solicitacao.numeroCpf, 
            
            solicitacao.cargo, 
            
            solicitacao.dataAdmissao, 
            
            solicitacao.dataRequerimento, 
            
            solicitacao.remuneracao, 
            
            solicitacao.idDocumentoPDF
        ];

        return this.executeSql(sql, params)

            .then((result) => {

                if (solicitacao.funcao) {

                    this.salvarFuncoes(solicitacao.funcao, result.insertId);
                }
            })
    }

    salvarFuncoes(funcoes, idSolicitacao) {

        (funcoes || []).forEach(funcao => {

            let sqlFuncao = `
                            
                INSERT INTO tb_solicitacao_funcao

                    (idSolicitacao, nome, dataInicio, dataFinal)

                VALUES

                    (?, ?, ?, ?)`;

            let paramsFuncao = [idSolicitacao, funcao.nome, funcao.dataInicio, funcao.dataFinal];

            this.executeSql(sqlFuncao, paramsFuncao)
        })
    }

    atualizar(solicitacao) {

        let sql = `
                        
            UPDATE tb_solicitacao SET 
            
                codTipoSolicitacao = ?, 
                
                numeroCpf = ?, 
                
                cargo = ?, 
                
                dataAdmissao = ?, 
                
                dataRequerimento = ?, 
                
                remuneracao = ?, 
                
                idDocumentoPDF = ?
                
                WHERE idColare = ?
        `;

        let params = [

            solicitacao.codTipoSolicitacao, 
            
            solicitacao.numeroCpf, 
            
            solicitacao.cargo, 
            
            solicitacao.dataAdmissao, 
            
            solicitacao.dataRequerimento, 
            
            solicitacao.remuneracao, 
            
            solicitacao.idDocumentoPDF,

            solicitacao.idColare
        ];

        return this.executeSql(sql, params)

            .then((result) => {

                this.querySqlFirst('SELECT id FROM tb_solicitacao WHERE idColare = ?', [solicitacao.idColare])

                    .then((resultado) => {

                        if (resultado) {

                            this.executeSql("DELETE FROM tb_solicitacao_funcao WHERE idSolicitacao = ?", [resultado.id])

                            if (solicitacao.funcao) {

                                this.salvarFuncoes(solicitacao.funcao, resultado.id);
                            }
                        }
                    })
            })
    }

    remover(id) {

        return this.querySqlFirst('SELECT id FROM tb_solicitacao WHERE idColare = ?', [id])

            .then((resultado) => {

                if (resultado) {

                    this.executeSql('DELETE FROM tb_solicitacao WHERE idColare = ?', [id])

                        .then(() => {

                            this.executeSql('DELETE FROM tb_solicitacao_funcao WHERE idSolicitacao = ?', [resultado.id]);
                        })
                }
            })
    }
}

app.service('TokenService', ['$http', TokenService]);

app.service('SolicitacaoRepository', [SolicitacaoRepository]);