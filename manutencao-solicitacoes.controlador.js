const SolicitacaoControlador = ($scope, $http, TokenService, SolicitacaoRepository) => {

    /**
     * DEFINE AS MENSAGENS QUE SERÃO GERADAS PELO COLARE
     */
    $scope.mensagens = [];

    /**
     * DEFINE O PADRÃO DE EXPRESSÃO REGULAR PARA VALORES NUMÉRICOS
     */
    $scope.onlyNumbers = /^\d+$/;

    /**
     * DEFINE OS VALORES VÁLIDOS PARA A TABELA DE DOMÍNIO
     */
    $scope.codTipoSolicitacaoList = [

        { codigo: 1, descricao: 'APOSENTADORIA' },

        { codigo: 2, descricao: 'PENSÃO' }

    ];

    /**
     * SOLICITAÇÕES ENVIADAS AO COLARE
     */
    $scope.solicitacoes = [];

    /**
     * CRIA O OBJETO DE SOLICITAÇÃO
     */
    $scope.solicitacao = {};

    /**
     * CRIANDO O OBJETO DE FUNÇÃO
     */
    $scope.funcao = {};

    /**
     * DEFINE A REGRA DE INICIALIZAÇÃO DO TELA
     */
    let inicializarTela = () => {

        TokenService.checkTokenOnInit()
            
            .then((isToken) => $scope.$apply(() => $scope.tokenValido = isToken));

        carregarSolicitacoes();
    }

    /**
     * INICIAR OBJETO DE SOLICITAÇÃO (VAZIO)
     */
    let iniciarSolicitacao = () => $scope.solicitacao = {};

    /**
     * CARREGAR AS SOLICITAÇÕES ARMAZENADAS NO BROWSER
     */
    let carregarSolicitacoes = () => {

        SolicitacaoRepository.listar()

            .then((solicitacoes) => $scope.$apply(() => $scope.solicitacoes = solicitacoes));
    }

    /**
     * FECHAR ALERTA
     */
    $scope.fecharAlerta = (indice) => {

        jQuery(`.alert_${indice}`).alert('close');
    }

    /**
     * REALIZA O UPLOAD DOS ARQUIVOS NO COLARE
     */
    $scope.upload = (arquivos) => {

        // DEFINE O OBJETO FORM-DATA
        let formData = new FormData();

        // ADICIONA O ITEM ARQUIVO
        formData.append("arquivo", arquivos[0]);

        // REALIZA A CONFIGURAÇÃO DE AUTORIZAÇÃO COM O TOKEN
        let configuracao = { 
            
            headers: { 
                
                'Content-Type': undefined,

                'Authorization': TokenService.getTokenValue()
            } 
        };

        // ENVIA O ARQUIVO SELECIONADO PARA O COLARE
        $http.post(ENVIRONMENT['URL_UPLOAD_ARQUIVO'], formData, configuracao)
        
            // CASO O ARQUIVO SELECIONADO SEJA ACEITO PELO COLARE, O IDENTIFICADOR GERADO É AGREGADO AO OBJETO DE SOLICITAÇÃO
            .then((response) => $scope.solicitacao.idDocumentoPDF = response.data.arquivo)
            
            // CASO O ARQUIVO SELECIONADO SEJA REJEITADO, A MENSAGEM É EXIBIDA AO USUÁRIO
            .catch((response) => BootBoxService.alert(response.data.message));
    };

    /**
     * MÉTODO RESPONSÁVEL POR ADICIONAR UMA FUNÇÃO NA SOLICITAÇÃO
     */
    $scope.adicionarFuncao = () => {

        try {

            // VERIFICA SE O NOME DA FUNÇÃO FOI DEFINIDA
            Exceptions.throwIf(!$scope.funcao.nome, 'É necessário informar o nome da função!')

            // VERIFICA SE A DATA DE INÍCIO DA FUNÇÃO FOI DEFINIDA
            Exceptions.throwIf(!$scope.funcao.dataInicio, 'É necessário informar a data de início da função!')

            // VERIFICA SE A DATA FINAL DA FUNÇÃO FOI DEFINIDA
            Exceptions.throwIf(!$scope.funcao.dataFinal, 'É necessário informar data final da função!!')

            // VERIFICA SE NA SOLICITAÇÃO EXISTE A PROPRIEDADE FUNÇÃO
            if (!$scope.solicitacao.funcao) {

                // CASO NÃO EXISTA, A PROPRIEDADE É CRIADA COM UM ARRAY VAZIO
                $scope.solicitacao.funcao = [];
            }
            
            // ADICIONA A FUNÇÃO NO ESCOPO DA SOLICITAÇÃO
            $scope.solicitacao.funcao.push($scope.funcao);

            // ATRIBUI A FUNÇÃO UM OBJETO VAZIO
            $scope.funcao = {};

        } catch (e) {

            // EXISET A MENSAGEM DE EXCEÇÃO
            BootBoxService.alert(e.message)
        }
    }

    /**
     * MÉTODO RESPONSÁVEL POR EXCLUIR UMA FUNÇÃO ASSOCIADA A SOLICITAÇÃO
     */
    $scope.excluirFuncao = (funcao) => {

        // CONFIRMA COM O USUÁRIO SE REALMENTE É A AÇÃO QUE O MESMO QUER TOMAR
        BootBoxService.confirm(`Deseja excluir a função ${funcao.nome}?`)

            .then(() => {

                // APLICA NO ESCOPO DO ANGULARJS A REMOÇÃO DA FUNÇÃO
                $scope.$apply(() => {

                    // OBTEM O ÍNDICE DA FUNÇÃO SELECIONADA
                    let index = $scope.solicitacao.funcao.indexOf(funcao)

                    // EXCLUI A FUNÇÃO PELO ÍNDICE
                    $scope.solicitacao.funcao.splice(index, 1)
                })
            })
    }

    /**
     * MÉTODO RESPONSÁVEL POR ENVIAR OS DADOS DE SOLICITAÇÃO PARA O COLARE
     */
    $scope.enviar = () => {

        // CONFIRMA COM O USUÁRIO SE REALMENTE É A AÇÃO QUE O MESMO QUER TOMAR
        BootBoxService.confirm('DESEJA REALMENTE SALVAR A SOLICITAÇÃO?')

            .then(() => {

                // LIMPA AS MENSAGENS DE ERROS NA TELA
                $scope.mensagens = [];

                // OBTEM A URL DO ENDPOINT CORRESPONDENTE AO ENVIO DE DADOS DE SOLICITAÇÃO
                let endpoint = ENVIRONMENT['URL_ENVIO_LAYOUT']('CCEAD', 'SOLICITACAO', moment().month(), moment().year());
        
                // OBTEM OS DADOS DA SOLICITAÇÃO
                let solicitacao = tratarSolicitacao();
        
                // FAZ A REQUISIÇÃO DE ENVIO DA SOLICITAÇÃO AO COLARE
                $http.post(endpoint, solicitacao, { headers: { 'Authorization': TokenService.getTokenValue() } })
        
                    // TRATA O RETORNO DE ENVIO COM SUCESSO
                    .then(tratarEnvioSucesso)
            
                    // TRATA O RETORNO DE ERRO NO ENVIO
                    .catch(tratarRetornoErro);
            })
    }

    /**
     * MÉTODO RESPONSÁVEL POR ENVIAR OS DADOS DE SOLICITAÇÃO PARA O COLARE
     */
    $scope.atualizar = () => {

        // CONFIRMA COM O USUÁRIO SE REALMENTE É A AÇÃO QUE O MESMO QUER TOMAR
        BootBoxService.confirm('DESEJA REALMENTE SALVAR A SOLICITAÇÃO?')

            .then(() => {

                // LIMPA AS MENSAGENS DE ERROS NA TELA
                $scope.mensagens = [];

                // OBTEM A URL DO ENDPOINT CORRESPONDENTE A ATUALIZAÇÃO DOS DADOS DE SOLICITAÇÃO
                let endpoint = ENVIRONMENT['URL_ENVIO_LAYOUT_ID']('CCEAD', 'SOLICITACAO', moment().month(), moment().year(), $scope.solicitacao.idColare);
        
                // OBTEM OS DADOS DA SOLICITAÇÃO
                let solicitacao = tratarSolicitacao();
        
                // FAZ A REQUISIÇÃO DE ALTERAÇÃO DA SOLICITAÇÃO AO COLARE
                $http.put(endpoint, solicitacao, { headers: { 'Authorization': TokenService.getTokenValue() } })
        
                    // TRATA O RETORNO DE ALTERAÇÃO COM SUCESSO
                    .then(tratarAtualizacaoSucesso)
        
                    // TRATA O RETORNO DE ERRO NO ENVIO
                    .catch(tratarRetornoErro);
            })
    }

    /**
     * MÉTODO RESPONSÁVEL POR CARREGAR OS DADOS DA SOLICITAÇÃO NA TELA PARA ALTERAÇÃO
     */
    $scope.alterar = (index) => {

        // CARREGA OS DADOS DA SOLICITAÇÃO PELO SEU ÍNDICE NO ARRAY
        $scope.solicitacao = $scope.solicitacoes[index];
    }

    /**
     * MÉTODO RESPONSÁVEL POR EXCLUIR UMA ENTREGA NO COLARE
     */
    $scope.excluir = (index) => {

        // CONFIRMA COM O USUÁRIO SE REALMENTE É A AÇÃO QUE O MESMO QUER TOMAR
        BootBoxService.confirm('DESEJA REALMENTE EXCLUIR A SOLICITAÇÃO?')

            .then(() => {

                // OBTEM A SOLICITAÇÃO PELO SEU ÍNDICE
                let solicitacao = $scope.solicitacoes[index];

                // LIMPA AS MENSAGENS DE ERROS NA TELA
                $scope.mensagens = [];

                // OBTEM A URL DO ENDPOINT CORRESPONDENTE A EXCLUSÃO DOS DADOS DE SOLICITAÇÃO
                let endpoint = ENVIRONMENT['URL_ENVIO_LAYOUT_ID']('CCEAD', 'SOLICITACAO', moment().month(), moment().year(), solicitacao.idColare);

                // FAZ A REQUISIÇÃO DE EXCLUSÃO DA SOLICITAÇÃO AO COLARE
                $http.delete(endpoint, { headers: { 'Authorization': TokenService.getTokenValue() } })

                    // TRATA O RETORNO DE EXCLUSÃO COM SUCESSO
                    .then(tratarExclusaoSucesso)

                    // TRATA O RETORNO DE ERRO NO ENVIO
                    .catch(tratarRetornoErro);
            })
    }

    /**
     * FUNÇÃO RESPONSÁVEL POR TRATAR A RESPOSTA DE EXCLUSÃO DE SOLICITAÇÃO
     */
    let tratarExclusaoSucesso = (response) => {

        // SOLICITA A EXCLUSÃO DOS DADOS DA SOLICITAÇÃO DA BASE LOCAL
        SolicitacaoRepository.remover(response.data.arquivo.id)

            // APRESENTA UMA MENSAGEM DE SUCESSO
            .then(() => BootBoxService.alert('SOLICITAÇÃO EXCLUÍDA COM SUCESSO!'))

            // ATUALIZA AS SOLICITAÇÕES NA TELA
            .then(carregarSolicitacoes)
    }

    /**
     * FUNÇÃO RESPONSÁVEL POR TRATAR A RESPOSTA DE ALTERAÇÃO DE SOLICITAÇÃO
     */
    let tratarAtualizacaoSucesso = (response) => {

        // OBTEM OS DADOS DE RETORNO DA REQUISIÇÃO
        let retorno = response.data;

        // SOLICITA A ALTERAÇÃO DOS DADOS DA SOLICITAÇÃO DA BASE LOCAL
        SolicitacaoRepository.atualizar(retornoToSolicitacao(retorno))

            // APRESENTA UMA MENSAGEM DE SUCESSO
            .then(() => BootBoxService.alert('SOLICITAÇÃO ATUALIZADA COM SUCESSO!'))

            // INICIALIZA O OBJETO DE SOLICITAÇÃO, PARA UM NOVO CADASTRO
            .then(iniciarSolicitacao)

            // ATUALIZA AS SOLICITAÇÕES NA TELA
            .then(carregarSolicitacoes)
    }

    /**
     * FUNÇÃO RESPONSÁVEL POR TRATAR A RESPOSTA DE INCLUSÃO (ENVIO) DE SOLICITAÇÃO
     */
    let tratarEnvioSucesso = (response) => {

        // OBTEM OS DADOS DE RETORNO DA REQUISIÇÃO
        let retorno = response.data;

        // SOLICITA A INCLUSÃO DOS DADOS DA SOLICITAÇÃO DA BASE LOCAL
        SolicitacaoRepository.salvar(retornoToSolicitacao(retorno))

            // APRESENTA UMA MENSAGEM DE SUCESSO
            .then(() => BootBoxService.alert('SOLICITAÇÃO CRIADA COM SUCESSO!'))

            // INICIALIZA O OBJETO DE SOLICITAÇÃO, PARA UM NOVO CADASTRO
            .then(iniciarSolicitacao)

            // ATUALIZA AS SOLICITAÇÕES NA TELA
            .then(carregarSolicitacoes)
    }

    /**
     * FUNÇÃO RESPONSÁVEL POR REALIZAR O DE/PARA DOS DADOS RETORNADOS PELO COLARE PARA A ESTRUTURA INTERNA DA BASE LOCAL
     */
    let retornoToSolicitacao = (retorno) => {

        return {

            // OBTENDO O ID GERADO PELO COLARE
            idColare: retorno.arquivo.id, 
            
            // OBTENDO O CÓDIGO DO TIPO DE SOLICITAÇÃO
            codTipoSolicitacao: retorno.arquivo.jsonNode.codTipoSolicitacao, 
            
            // OBTENDO O NÚMERO DO CPF
            numeroCpf: retorno.arquivo.jsonNode.numeroCpf, 
            
            // OBTENDO O CARGO
            cargo: retorno.arquivo.jsonNode.cargo, 
            
            // OBTENDO A DATA DE ADMISSÃO
            dataAdmissao: retorno.arquivo.jsonNode.dataAdmissao, 
            
            // OBTENDO A DATA DO REQUERIMENTO
            dataRequerimento: retorno.arquivo.jsonNode.dataRequerimento, 
            
            // OBTENDO A REMUNERAÇÃO
            remuneracao: retorno.arquivo.jsonNode.remuneracao, 
            
            // OBTENDO O ID DO DOCUMENTO PDF
            idDocumentoPDF: retorno.arquivo.jsonNode.idDocumentoPDF,

            // OBTENDO AS FUNÇÕES
            funcao: retorno.arquivo.jsonNode.funcao
        }
    }

    /**
     * FUNÇÃO RESPONSÁVEL POR TRATAR OS DADOS DE SOLICITAÇÃO INFORMADOS PARA ENVIO AO COLARE
     */
    let tratarSolicitacao = () => {

        // REALIZA UM CLONE DO OBJETO LIGADO A TELA
        let solicitacao = Object.assign({}, $scope.solicitacao);

        // REMOVE A PROPRIEDADE idColare
        delete solicitacao.idColare

        // REMOVE A PROPRIEDADE id
        delete solicitacao.id

        // VERIFICA SE EXISTE A PROPRIEDADE dataAdmissao
        if (solicitacao.dataAdmissao) {

            // CONVERTE O FORMATO DE DATA PARA O PADRÃO AMERICANO UTILIZADO NO COLARE ANO-MES-DIA
            solicitacao.dataAdmissao = moment(solicitacao.dataAdmissao).format('YYYY-MM-DD')
        }

        // VERIFICA SE EXISTE A PROPRIEDADE dataRequerimento
        if (solicitacao.dataRequerimento) {

            // CONVERTE O FORMATO DE DATA PARA O PADRÃO AMERICANO UTILIZADO NO COLARE ANO-MES-DIA
            solicitacao.dataRequerimento = moment(solicitacao.dataRequerimento).format('YYYY-MM-DD')
        }

        // PARA CADA FUNÇÃO ASSOCIADA A SOLICITAÇÃO
        (solicitacao.funcao || []).forEach(funcao => {

            // CONVERTE O FORMATO DA DATA DE INÍCIO PARA O PADRÃO AMERICANO UTILIZADO NO COLARE ANO-MES-DIA
            funcao.dataInicio = moment(funcao.dataInicio).format('YYYY-MM-DD')

            // CONVERTE O FORMATO DA DATA FINAL PARA O PADRÃO AMERICANO UTILIZADO NO COLARE ANO-MES-DIA
            funcao.dataFinal = moment(funcao.dataFinal).format('YYYY-MM-DD')

            // REMOVE A PROPRIEDADE id
            delete funcao.id

            // REMOVE A PROPRIEDADE idSolicitacao
            delete funcao.idSolicitacao
        })

        return solicitacao;
    }

    /**
     * FUNÇÃO RESPONSÁVEL POR TRATAR AS MENSAGENS DE ERRO RETORNADAS NAS REQUISIÇÕES
     */
    let tratarRetornoErro = (response) => {

        // VERIFICA SE O STATUS DA CONEXÃO É INERENTE A FALTA DE CONECTIVIDADE
        if (response.status != -1) {

            // OBTEM OS DADOS DE RETORNO DA REQUISIÇÃO
            let retorno = response.data;

            // VERIFICA SE O RETORNO É UM ARRAY
            if (Array.isArray(retorno)) {
            
                // CASO SEJA UM ARRAY, TRATA-SE DE ERROS NAS REGRAS DE INTEGRIDADE, ADICIONA SUAS MENSAGENS A LISTA DE MENSAGENS DE ERRO
                $scope.mensagens = retorno.map((validacao) => validacao.message);

                // VERIFICA SE O RETORNO POSSUI A PROPRIEDADE message
            } else if (retorno.message) {

                // CASO POSSUA A PROPRIEDADE message, A MESMA É EXIBIDA NUM ALERTA
                BootBoxService.alert(response.data.message)

            } else {

                // NO CASO PADRÃO, AS MENSAGENS SÃO ORIUNDAS DE ERROS ENCONTRADOS NAS REGRAS DE RECEPÇÃO, AS MENSAGENS SÃO ADICIONADAS A LISTA DE MENSAGENS DE ERRO
                $scope.mensagens = retorno.mensagens.erros.map((erro) => erro.mensagem);
            }

        } else {

            // APRESENTA UM ALERTA PARA ERRO DE CONECTIVIDADE
            BootBoxService.alert('Sem comunicação com a internet!')
        }
    }

    // REALIZA A INICIALIZAÇÃO DA TELA, OBTENDO, CASO PRECISO, O TOKEN DE ENVIO DE DADOS NO PASSAPORTE
    inicializarTela();
};

// REGISTRA O CONTROLADOR NO SCOPO DO ANGULARJS
app.controller('SolicitacaoControlador', ['$scope', '$http', 'TokenService', 'SolicitacaoRepository', SolicitacaoControlador]);