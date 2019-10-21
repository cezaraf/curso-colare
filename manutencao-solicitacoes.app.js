/**
 * CRIA UMA VARIÁVEL GLOBAL PARA DADOS DE AMBIENTE
 */
const ENVIRONMENT = {

    // LISTAGEM DOS TIPOS DE SOLICITAÇÃO
    'TIPOS_SOLICITACAO': {
        
        1: 'APOSENTADORIA',

        2: 'PENSÃO',
    },

    // URL PARA OBTENÇÃO DAS REPRESENTAÇÕES DE UM USUÁRIO
    'URL_OBTER_REPRESENTACOES': 'https://testes.tcm.go.gov.br:8443/passaporte/api/auth/representacoes',

    /**
     * FUNÇÃO RESPONSÁVEL POR RETORNAR A URL RESPONSÁVEL POR OBTER UM TOKEN NO PASSAPORTE ATRAVÉS DO IDENTIFICADOR DA REPRESENTAÇÃO
     */
    'URL_OBTER_TOKEN': (id) => `https://testes.tcm.go.gov.br:8443/passaporte/api/auth/certificado?representacao=${id}`,

    // URL PARA UPLOAD DE ARQUIVOS NO COLARE
    'URL_UPLOAD_ARQUIVO': `https://testes.tcm.go.gov.br/recepcao/arquivo/upload`,

    /**
     * FUNÇÃO RESPONSÁVEL POR RETORNAR A URL PARA ENVIO DE DADOS DE UM DETERMINADO LAYOUT
     */
    'URL_ENVIO_LAYOUT': (spc, slayout, mes, ano) => `https://testes.tcm.go.gov.br/recepcao/${spc}/${slayout}/${mes}/${ano}`,

    /**
     * FUNÇÃO RESPONSÁVEL POR RETORNAR A URL PARA OBTENÇÃO / ALTERAÇÃO / EXCLUSÃO DE DADOS DE UM DETERMINADO LAYOUT
     */
    'URL_ENVIO_LAYOUT_ID': (spc, slayout, mes, ano, id) => `${ENVIRONMENT['URL_ENVIO_LAYOUT'](spc, slayout, mes, ano)}/${id}`
};

/**
 * CLASSE ESTÁTICA PARA AGREGAR FUNÇÃO INERENTE AO LANÇAMENTO DE EXCEÇÃO
 */
class Exceptions {

    /**
     * MÉTODO RESPONSÁVEL POR LANÇAR UMA EXCEÇÃO CASO O TESTE PARAMETRIZADO PASSE, OU SEJA, RETORNE TRUE
     * @param {*} test TESTE PARA O LANÇAMENTO DA EXCEÇÃO
     * @param {*} message MENSAGEM ASSOCIADA A EXCEÇÃO
     */
    static throwIf(test, message) {

        if (test) {

            throw new Error(message);
        }
    }
}

/**
 * CLASSE RESPONSÁVEL PELOS SERVIÇOS DE APRESENTAÇÃO DE ALERTAS, CONFIRMAÇÕE E SELEÇÕES
 */
class BootBoxService {

    /**
     * MÉTODO RESPONSÁVEL POR EXIBE UM MODEL COM OPÇÕES PARA SELEÇÃO
     * @param {*} titulo TÍTULO DO MODAL
     * @param {*} opcoes OPÇÕES A SEREM EXIBIDADES [{ text: string, value: any }]
     * return Promise<any>
     */
    static selecionarOpcao(titulo, opcoes) {

        return new Promise((resolve) => {

            bootbox.prompt({

                title: titulo,

                inputType: 'select',

                inputOptions: opcoes,

                callback: (opcaoSelecionada) => resolve(opcaoSelecionada)
            });
        })
    }

    /**
     * MÉTODO RESPONSÁVEL POR EXIBIR UM ALERTA NA TELA
     * @param {string} mensagem MENSAGEM DO ALERTA
     */
    static alert(mensagem) {

        bootbox.alert(mensagem);
    }

    /**
     * MÉTODO RESPONSÁVEL POR EXIBIR UMA CONFIRMAÇÃO NA TELA
     * @param {string} mensagem MENSAGEM DA CONFIRMAÇÃO
     * return Promise
     */
    static confirm(mensagem) {

        return new Promise((resolve, reject) => {

            bootbox.confirm({

                message: mensagem,
    
                buttons: {
    
                    confirm: {
    
                        label: 'Sim',
    
                        className: 'btn-success'
                    },
    
                    cancel: {
    
                        label: 'Não',
    
                        className: 'btn-danger'
                    }
                },
    
                callback: function (result) {
                    
                    result ? resolve() : reject();
                }
            });
        })
    }
}

// CRIA O BANCO DE DADOS WEBSQL ASSOCIADO AO RECURSO ACESSADO (URL ACESSSADA PELO BROWSER)
let database = openDatabase('CURSO_COLARE', '1.0', 'BANCO DE DADOS PARA O USO NO CURSO DO COLARE', 200000)

// INICIALIZA UMA TRANSAÇÃO
database.transaction((transaction) => {

    // CRIA A TABELA DE SOLICITAÇÕES
    transaction.executeSql(`

        CREATE TABLE IF NOT EXISTS tb_solicitacao (

            id INTEGER PRIMARY KEY,

            idColare INTEGER UNIQUE,

            codTipoSolicitacao INTEGER NOT NULL,

            numeroCpf VARCHAR(11) NOT NULL,

            cargo VARCHAR(100) NOT NULL,

            dataAdmissao DATE NOT NULL,

            dataRequerimento DATE NOT NULL,

            remuneracao REAL NOT NULL,

            idDocumentoPDF VARCHAR(36) NOT NULL
        );
    `);

    // CRIA A TABELA DE FUNÇÕES
    transaction.executeSql(`

        CREATE TABLE IF NOT EXISTS tb_solicitacao_funcao (

            id INTEGER PRIMARY KEY,

            idSolicitacao INTEGER NOT NULL,

            nome VARCHAR(100) NOT NULL,

            dataInicio DATE NOT NULL,

            dataFinal DATE NOT NULL
        );
    `);
});

// INICIALIZA O APP NO ANGULARJS
const app = angular.module('app', []);

/**
 * CLASSE RESPONSÁVEL POR INTERCEPTAR REQUISIÇÕES HTTP
 */
class HttpInterceptor {

    /**
     * CONSTRUTOR DA CLASSE
     * @param {*} $rootScope ESCOPO TOP-LEVEL DO ANGULARJS
     * @param {*} $q SERVIÇO PARA EXECUÇÃO DE FUNÇÕES ASSÍNCRONAS
     */
    constructor($rootScope, $q) {

        HttpInterceptor.$rootScope = $rootScope;

        HttpInterceptor.$q = $q;
    }

    /**
     * MÉTODO DE INTERCEPTAÇÃO DE REQUISIÇÕES
     */
    request(request)  {
            
        HttpInterceptor.$rootScope.qtdRequisicoes++;

        return request;
    }

    /**
     * MÉTODO DE INTERCEPTAÇÃO DE RESPOSTAS
     */
    response(response) { 
        
        HttpInterceptor.$rootScope.qtdRequisicoes--

        return response;
    }

    /**
     * MÉTODO DE INTERCEPTAÇÃO DE RESPOSTAS COM ERROS
     */
    responseError(resonseError) {
        
        HttpInterceptor.$rootScope.qtdRequisicoes--

        return HttpInterceptor.$q.reject(resonseError);
    }
}

// CRIA UM FACTORY PARA O INTERCEPTADOR
app.factory('HttpInterceptor', ['$rootScope', '$q', HttpInterceptor]);

// CRIA UM FILTER (PIPE) CHAMADO codTipoSolicitacao PARA USAR NA INTERPOLAÇÃO
app.filter('codTipoSolicitacao', () => (input) => ENVIRONMENT['TIPOS_SOLICITACAO'][input]);

// CONFIGURA O INTERCEPTADOR NO ANGULARJS
app.config(['$httpProvider', '$qProvider', ($httpProvider, $qProvider) => {
    
    $qProvider.errorOnUnhandledRejections(false);
    
    $httpProvider.interceptors.push('HttpInterceptor')
}]);

// EXECUTA A APLICAÇÃO
app.run(['$rootScope', ($rootScope) => $rootScope.qtdRequisicoes = 0]);