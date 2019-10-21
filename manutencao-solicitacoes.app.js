const ENVIRONMENT = {

    'TIPOS_SOLICITACAO': {
        
        1: 'APOSENTADORIA',

        2: 'PENSÃO',
    },

    'URL_OBTER_REPRESENTACOES': 'https://testes.tcm.go.gov.br:8443/passaporte/api/auth/representacoes',

    'URL_OBTER_TOKEN': (id) => `https://testes.tcm.go.gov.br:8443/passaporte/api/auth/certificado?representacao=${id}`,

    'URL_UPLOAD_ARQUIVO': `https://testes.tcm.go.gov.br/recepcao/arquivo/upload`,

    'URL_ENVIO_LAYOUT': (spc, slayout, mes, ano) => `https://testes.tcm.go.gov.br/recepcao/${spc}/${slayout}/${mes}/${ano}`,

    'URL_ENVIO_LAYOUT_ID': (spc, slayout, mes, ano, id) => `${ENVIRONMENT['URL_ENVIO_LAYOUT'](spc, slayout, mes, ano)}/${id}`
};

class Exceptions {

    static throwIf(test, message) {

        if (test) {

            throw new Error(message);
        }
    }
}

class BootBoxService {

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

    static alert(mensagem) {

        bootbox.alert(mensagem);
    }

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

let database = openDatabase('CURSO_COLARE', '1.0', 'BANCO DE DADOS PARA O USO NO CURSO DO COLARE', 200000)

database.transaction((transaction) => {

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

const app = angular.module('app', []);

class HttpInterceptor {

    constructor($rootScope, $q) {

        HttpInterceptor.$rootScope = $rootScope;

        HttpInterceptor.$q = $q;
    }

    request(request)  {
            
        HttpInterceptor.$rootScope.qtdRequisicoes++;

        return request;
    }

    response(response) { 
        
        HttpInterceptor.$rootScope.qtdRequisicoes--

        return response;
    }

    responseError(resonseError) {
        
        HttpInterceptor.$rootScope.qtdRequisicoes--

        return HttpInterceptor.$q.reject(resonseError);
    }
}

app.factory('HttpInterceptor', ['$rootScope', '$q', HttpInterceptor]);

app.filter('codTipoSolicitacao', () => (input) => ENVIRONMENT['TIPOS_SOLICITACAO'][input]);

app.config(['$httpProvider', '$qProvider', ($httpProvider, $qProvider) => {
    
    $qProvider.errorOnUnhandledRejections(false);
    
    $httpProvider.interceptors.push('HttpInterceptor')
}]);

app.run(['$rootScope', ($rootScope) => $rootScope.qtdRequisicoes = 0]);