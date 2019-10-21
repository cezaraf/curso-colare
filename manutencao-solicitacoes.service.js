/**
 * CLASSE RESPONSÁVEL POR TRAZER SERVIÇOS INERENTES AO TOKEN
 */
class TokenService {

    // IDENTIFICADOR DO JOB (SET-INTERVAL)
    jobId = null

    /**
     * CONSTRUTOR DA CLASSE
     * @param {*} $http SERVIÇO RESPONSÁVEL POR FORNECEDOR MÉTODOS HTTP
     */
    constructor($http) {

        this.$http = $http;
    }

    /**
     * MÉTODO RESPONSÁVEL POR VERIFICAR SE EXISTE TOKEN ATIVO AO INICIALIZAR A APLICAÇÃO
     */
    checkTokenOnInit() {

        // VERIFICA SE EXISTE UM JOB CRIADO
        if (this.jobId) {

            // REMOVE O JOB DO ESCOPO DE EXECUÇÃO
            clearInterval(this.jobId);
        }

        // CRIA UMA PROMISE 
        return new Promise(async (resolve) => {

            // VERIFICA SE EXISTE UM TOKEN E SE O MESMO É VÁLIDO
            if (!this.isTokenValido()) {

                // CASO NÃO EXISTA UM TOKEN, É FEITA UMA REQUISIÇÃO PARA OBTER AS REPRESENTAÇÕES DO USUÁRIO
                let representacoes = await this.$http.get(ENVIRONMENT['URL_OBTER_REPRESENTACOES']).then((response) => response.data.representacoes)
    
                // VERIFICA SE PARA O USUÁRIO EXISTE REPRESENTAÇÃO
                if (representacoes && representacoes.length > 0) {
    
                    // CASO EXISTA, É CRIADO UMA ESTRUTURA DE OPÇÕES DESSAS REPRESENTAÇÕES
                    let opcoes = representacoes.map(({ codigo, representacao, unidade }) => { return { text: `${representacao} - ${unidade}`, value: codigo } })
    
                    // UM MODAL COM AS REPRESENTAÇÕES SERÁ APRESENTADO PARA ESCOLHA DO USUÁRIO
                    let opcaoSelecionada = await BootBoxService.selecionarOpcao('SELECIONE A REPRESENTAÇÃO', opcoes)
    
                    // COM A REPRESENTAÇÃO ESCOLHIDA, É CRIADA UMA REQUISIÇÃO PARA OBTENÇÃO DO TOKEN
                    let obterTokenResponse = await this.$http.get(ENVIRONMENT['URL_OBTER_TOKEN'](opcaoSelecionada)).then(resp => resp.data)
    
                    // É ATUALIZADO O VALOR DO TOKEN LOCALMENTE
                    this.update(obterTokenResponse);
    
                    // A PROMISE RETORNA TRUE
                    resolve(true);
    
                    // É CRIADO UM JOB QUE SERÁ EXECUTADO DE SEGUNDO EM SEGUNDO PARA AVERIGUAR SE O TOKEN AINDA É VÁLIDO
                    this.jobId = setInterval(async () => await this.checkTokenOnInit(), 1000)

                } else {

                    // A PROMISE RETORNA FALSE
                    resolve(false);
                }
                
            } else {
    
                // A PROMISE RETORNA FALSE
                resolve(true);
            }
        })
    }

    /**
     * VERIFICA SE EXISTE UM TOKEN REGISTRADO LOCALMENTE
     */
    isToken() {

        return localStorage.getItem('TOKEN_PASSAPORTE') !== null;
    }

    /**
     * OBTEM O TOKEN REGISTRADO LOCALMENTE
     */
    getToken() {

        return JSON.parse(localStorage.getItem('TOKEN_PASSAPORTE'))
    }

    /**
     * OBTEM O VALOR DO TOKEN REGISTRADO LOCALMENTE
     */
    getTokenValue() {

        return this.getToken().token.valor;
    }

    /**
     * ATUALIZA O TOKEN LOCALMENTE
     * @param {*} token VALOR DO TOKEN RETORNADO PELO PASSAPORTE
     */
    update(token) {

        localStorage.setItem('TOKEN_PASSAPORTE', JSON.stringify(token))
    }

    /**
     * VERIFICA SE O TOKEN É VÁLIDO, OU SEJA, EXISTE E NÃO ESTÁ EXPIRADO
     */
    isTokenValido() {

        return this.isToken() && this.getToken().token.claims.exp > (Date.now() / 1000);
    }
}

/**
 * CLASSE PARA O REPOSITÓRIO DE DADOS DE SOLICITAÇÕES
 */
class SolicitacaoRepository {

    /**
     * MÉTODO RESPONSÁVEL POR EXECUTAR UM SQL QUERY (CONSULTA) LOCALMENTE
     * @param {string} query CONSULTA SQL
     * @param {array<any>} params 
     */
    querySql(query, params) {

        // CASO NÃO HAJA PARÂMETROS INICIALIZA COM UM ARRAY VAZIO
        params = params || [];

        // CRIA UMA PROMISE
        return new Promise((resolve, reject) => {

            // CRIA UMA TRANSAÇÃO E EXECUTA A CONSULTA
            database.transaction((tx) => tx.executeSql(query, params, 
                
                // CRIA UMA FUNÇÃO DE CALLBACK DE SUCESSO E RESOLVE OS DADOS DA CONSULTA PELA PROMISE
                (tx, result) => resolve(this.sqlResultToArray(result.rows)),
                
                // CRIA UMA FUNÇÃO DE CALLBACK DE ERRO E RETORNA COM REJEIÇÃO O RESULTADO DA CONSULTA
                (tx, result) => reject(result)))
        })
    }

    /**
     * MÉTODO RESPONSÁVEL POR EXECUTAR UMA SQL QUERY (CONSULTA) LOCALMENTE E RETORNAR O PRIMEIRO REGISTRO
     * @param {string} query CONSULTA SQL
     * @param {array<any>} params 
     */
    querySqlFirst(query, params) {

        // EXECUTA A QUERY E RETORNA O PRIMEIRO REGISTRO DA MESMA
        return this.querySql(query, params).then((resultado) => resultado[0]);
    }

    /**
     * MÉTODO RESPONSÁVEL POR MAPEAR O RETORNO DAS QUERIES NUM ARRAY
     * @param {*} result 
     */
    sqlResultToArray(result) {

        // CRIA O ARRAY DE RETORNO
        let array = [];

        // PERCORRE A ESTRUTURA DE RETORNO DA CONSULTA
        for (let i = 0; i < result.length; i++) {

            // MAPEIA O VALOR NO ARRAY
            array[i] = result[i]
        }

        // RETORNA O ARRAY
        return array;
    }

    /**
     * MÉTODO RESPONSÁVEL POR EXECUTAR UM SQL (INSERT, UPDATE, DELETE) NO BANCO LOCAL
     * @param {*} sql INSTRUÇÃO SQL
     * @param {*} params PARÂMETROS
     */
    executeSql(sql, params) {

        // CASO NÃO HAJA PARÂMETROS INICIALIZA COM UM ARRAY VAZIO
        params = params || [];

        // CRIA UMA PROMISE
        return new Promise((resolve, reject) => {

            // CRIA UMA TRANSAÇÃO
            database.transaction(
                
                // EXECUTA A INSTRUÇÃO SQL
                (tx) => tx.executeSql(sql, params, 
                    
                    // FUNÇÃO DE CALLBACK PARA SUCESSO DA EXECUÇÃO: RESOLVE A PROMISE COM O RESULTADO
                    (tx, result) => resolve(result), 
                    
                    // FUNÇÃO DE CALLBACK PARA ERRO DA EXECUÇÃO: REJEITA A PROMISE COM O RESULTADO
                    (tx, result) => reject(result)));
        })
    }

    /**
     * MÉTODO RESPOSÁVEL POR LISTAR TODAS AS SOLICITAÇÕES
     */
    listar() {

        return this.querySql("select * from tb_solicitacao order by id desc")

            .then((solicitacoes) => {

                // PARA CADA SOLICITAÇÃO LISTADA
                solicitacoes.forEach((solicitacao) => {

                    // REALIZA A CONVERSÃO DE DATA PARA O FORMATO DA ISO8601
                    solicitacao.dataAdmissao = new Date(moment(solicitacao.dataAdmissao).toISOString());

                    // REALIZA A CONVERSÃO DE DATA PARA O FORMATO DA ISO8601
                    solicitacao.dataRequerimento = new Date(moment(solicitacao.dataRequerimento).toISOString());

                    // CARREGA AS FUNÇÕES ASSOCIADAS A SOLICITAÇÃO
                    this.querySql("select * from tb_solicitacao_funcao WHERE idSolicitacao = ?", [solicitacao.id])

                        .then((funcoes) => solicitacao.funcao = funcoes);
                })

                return solicitacoes;
            })
    }

    /**
     * MÉTODO RESPONSÁVEL POR PERSISTIR OS DADOS DA SOLICITAÇÃO
     * @param {*} solicitacao SOLICITAÇÃO A SER PERSISTIDA
     */
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

    /**
     * MÉTODO RESPONSÁVEL POR PERSISTIR FUNÇÕES
     * @param {*} funcoes FUNÇÕES A SEREM PERSISTIDAS
     * @param {*} idSolicitacao IDENTIFICADOR DA SOLICITAÇÃO
     */
    salvarFuncoes(funcoes, idSolicitacao) {

        // PARA CADA FUNÇÃO PARAMETRIZADA
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

    /**
     * MÉTODO RESPONSÁVEL POR ATUALIZAR UMA SOLICITAÇÃO NA BASE LOCAL
     * @param {*} solicitacao SOLICITAÇÃO A SER ATUALIZADA
     */
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

    /**
     * MÉTODO RESPONSÁVEL POR EXCLUIR UMA SOLICITAÇÃO DA BASE LOCAL
     * @param {*} id IDENTIFICADOR DA SOLICITAÇÃO
     */
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

// REGISTRA O TOKEN SERVICE NO ANGULARJS
app.service('TokenService', ['$http', TokenService]);

// REGISTRA O REPOSITÓRIO DE SOLICITAÇÕES NO ANGULARJS
app.service('SolicitacaoRepository', [SolicitacaoRepository]);